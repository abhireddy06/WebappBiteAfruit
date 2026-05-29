$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Join-Path $Root "frontend"
$DistDir = Join-Path $FrontendDir "dist"
$CredsFile = Join-Path $Root "creds.txt"
$Bucket = "biteafruit.in"
$Region = "ap-south-1"
$DistributionId = "EBXD0T8EUIBRX"
$S3WebsiteUrl = "http://biteafruit.in.s3-website.ap-south-1.amazonaws.com"

Write-Host "Deploying frontend to s3://$Bucket"

if (-not (Test-Path $FrontendDir)) {
  throw "Missing frontend folder: $FrontendDir"
}

if (-not (Test-Path $CredsFile)) {
  throw "Missing AWS credentials file: $CredsFile"
}

Write-Host "Building frontend..."
Push-Location $FrontendDir
try {
  npm.cmd run build
}
finally {
  Pop-Location
}

if (-not (Test-Path (Join-Path $DistDir "index.html"))) {
  throw "Frontend build did not create dist/index.html"
}

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

Write-Host "Uploading immutable frontend assets..."
aws s3 sync "$DistDir" "s3://$Bucket" `
  --delete `
  --cache-control "public,max-age=31536000,immutable" `
  --exclude "index.html"

Write-Host "Uploading no-cache index.html..."
aws s3 cp (Join-Path $DistDir "index.html") "s3://$Bucket/index.html" `
  --cache-control "no-cache,no-store,must-revalidate" `
  --content-type "text/html"

Write-Host "Trying CloudFront invalidation..."
try {
  aws cloudfront create-invalidation `
    --distribution-id $DistributionId `
    --paths "/*" `
    --query "Invalidation.{Id:Id,Status:Status,CreateTime:CreateTime}" `
    --output json
}
catch {
  Write-Warning "CloudFront invalidation failed. The S3 deploy is complete, but https://www.biteafruit.in may show cached content until CloudFront refreshes."
  Write-Warning $_.Exception.Message
}

Write-Host "Testing S3 website..."
Invoke-WebRequest -Uri $S3WebsiteUrl -UseBasicParsing -TimeoutSec 20 |
  Select-Object StatusCode, StatusDescription

Write-Host "Frontend deploy complete."
Write-Host "S3 website: $S3WebsiteUrl"
Write-Host "HTTPS site: https://www.biteafruit.in"
