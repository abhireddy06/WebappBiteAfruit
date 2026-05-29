$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BuildDir = Join-Path $Root "lambda-build"
$BackendApp = Join-Path $Root "backend\app"
$BuildApp = Join-Path $BuildDir "app"
$ZipFile = Join-Path $Root "backend-lambda.zip"
$CredsFile = Join-Path $Root "creds.txt"
$EnvFile = Join-Path $Root "lambda-env.generated.json"
$Region = "ap-south-1"
$FunctionName = "biteafruit-backend-dev"
$ApiBaseUrl = "https://rnlkkesj04.execute-api.ap-south-1.amazonaws.com"

Write-Host "Deploying backend Lambda: $FunctionName"

if (-not (Test-Path $BuildDir)) {
  throw "Missing lambda-build folder. Build dependencies first or restore lambda-build."
}

if (-not (Test-Path $BackendApp)) {
  throw "Missing backend app folder: $BackendApp"
}

if (-not (Test-Path $CredsFile)) {
  throw "Missing AWS credentials file: $CredsFile"
}

if (-not (Test-Path $EnvFile)) {
  throw "Missing Lambda env file: $EnvFile"
}

Write-Host "Refreshing Lambda app files..."
if (Test-Path $BuildApp) {
  Remove-Item -LiteralPath $BuildApp -Recurse -Force
}
Copy-Item -LiteralPath $BackendApp -Destination $BuildApp -Recurse

Write-Host "Creating Lambda zip..."
if (Test-Path $ZipFile) {
  Remove-Item -LiteralPath $ZipFile -Force
}
Push-Location $BuildDir
try {
  tar.exe -a -cf $ZipFile *
}
finally {
  Pop-Location
}

$Zip = Get-Item $ZipFile
Write-Host "Created $($Zip.Name), size $([Math]::Round($Zip.Length / 1MB, 2)) MB"

Write-Host "Loading AWS credentials from creds.txt..."
$Creds = Get-Content $CredsFile
$AccessKey = (($Creds | Where-Object { $_ -match "^\s*Access key\s*:" }) -replace "^.*?:\s*", "").Trim()
$SecretKey = (($Creds | Where-Object { $_ -match "^\s*Secret access key\s*:" }) -replace "^.*?:\s*", "").Trim()

if (-not $AccessKey -or -not $SecretKey) {
  throw "Could not parse Access key / Secret access key from creds.txt"
}

$env:AWS_ACCESS_KEY_ID = $AccessKey
$env:AWS_SECRET_ACCESS_KEY = $SecretKey
$env:AWS_DEFAULT_REGION = $Region

Write-Host "Checking AWS identity..."
aws sts get-caller-identity --query "{Account:Account,Arn:Arn}" --output json

Write-Host "Uploading Lambda code..."
aws lambda update-function-code `
  --function-name $FunctionName `
  --zip-file "fileb://$ZipFile" `
  --region $Region `
  --query "{FunctionName:FunctionName,LastModified:LastModified,CodeSha256:CodeSha256}" `
  --output json

aws lambda wait function-updated --function-name $FunctionName --region $Region

Write-Host "Updating Lambda environment..."
aws lambda update-function-configuration `
  --function-name $FunctionName `
  --environment "file://$EnvFile" `
  --region $Region `
  --query "{FunctionName:FunctionName,LastUpdateStatus:LastUpdateStatus,LastModified:LastModified}" `
  --output json

aws lambda wait function-updated --function-name $FunctionName --region $Region

Write-Host "Checking Lambda state..."
aws lambda get-function `
  --function-name $FunctionName `
  --region $Region `
  --query "Configuration.{State:State,LastUpdateStatus:LastUpdateStatus,LastModified:LastModified,Runtime:Runtime,Handler:Handler}" `
  --output json

Write-Host "Testing backend health..."
Invoke-RestMethod "$ApiBaseUrl/health"

Write-Host "Testing plans. Medium Bowl should be present..."
Invoke-RestMethod "$ApiBaseUrl/plans"

Write-Host "Backend deploy complete."
