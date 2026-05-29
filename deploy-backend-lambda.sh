#!/usr/bin/env bash
set -euo pipefail

REGION="${REGION:-ap-south-1}"
STAGE="${STAGE:-dev}"
FUNCTION_NAME="${FUNCTION_NAME:-biteafruit-backend-${STAGE}}"
ROLE_NAME="${ROLE_NAME:-biteafruit-lambda-role-${STAGE}}"
API_NAME="${API_NAME:-biteafruit-backend-api-${STAGE}}"
WORKBOOK_BUCKET="${EXCEL_S3_BUCKET:-biteafruit}"
WORKBOOK_KEY="${EXCEL_S3_KEY:-biteafruit/biteafruit.xlsx}"
JWT_SECRET="${JWT_SECRET:-}"
FRONTEND_ORIGIN="${FRONTEND_ORIGIN:-https://biteafruit.in,https://www.biteafruit.in,https://d29h10l2auj3ll.cloudfront.net,http://biteafruit.in,http://www.biteafruit.in,http://biteafruit.in.s3-website.ap-south-1.amazonaws.com}"
BUILD_DIR="${BUILD_DIR:-lambda-build}"
ZIP_FILE="${ZIP_FILE:-backend-lambda.zip}"

if [[ -z "${JWT_SECRET}" ]]; then
  echo "ERROR: Set JWT_SECRET before deploy. Example:"
  echo "  export JWT_SECRET='change-me-to-a-strong-32-char-secret'"
  exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "ERROR: aws CLI is required."
  exit 1
fi

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"
LAMBDA_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${FUNCTION_NAME}"

echo "Deploying ${FUNCTION_NAME} to ${REGION} in account ${ACCOUNT_ID}"

cat > trust-policy.json <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
JSON

cat > s3-policy.json <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::${WORKBOOK_BUCKET}/${WORKBOOK_KEY}"
    }
  ]
}
JSON

if ! aws iam get-role --role-name "${ROLE_NAME}" >/dev/null 2>&1; then
  aws iam create-role \
    --role-name "${ROLE_NAME}" \
    --assume-role-policy-document file://trust-policy.json >/dev/null
  aws iam attach-role-policy \
    --role-name "${ROLE_NAME}" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  echo "Created IAM role ${ROLE_NAME}. Waiting for IAM propagation..."
  sleep 20
else
  echo "IAM role ${ROLE_NAME} already exists"
fi

aws iam put-role-policy \
  --role-name "${ROLE_NAME}" \
  --policy-name BiteAFruitExcelS3Access \
  --policy-document file://s3-policy.json

rm -rf "${BUILD_DIR}" "${ZIP_FILE}"
mkdir -p "${BUILD_DIR}"

if command -v docker >/dev/null 2>&1; then
  echo "Building Lambda package with Docker..."
  docker run --rm \
    -v "${PWD}:/var/task" \
    public.ecr.aws/lambda/python:3.11 \
    /bin/sh -c "pip install -r backend/requirements.txt -t ${BUILD_DIR} && cp -r backend/app ${BUILD_DIR}/"
else
  echo "Docker not found. Building locally with python..."
  python -m pip install -r backend/requirements.txt -t "${BUILD_DIR}"
  cp -r backend/app "${BUILD_DIR}/"
fi

(
  cd "${BUILD_DIR}"
  zip -qr "../${ZIP_FILE}" .
)

ENV_VARS="Variables={APP_NAME=Bite a Fruit,ENVIRONMENT=${STAGE},LOG_LEVEL=INFO,JWT_SECRET=${JWT_SECRET},FRONTEND_ORIGIN=${FRONTEND_ORIGIN},EXCEL_STORAGE=s3,EXCEL_DATABASE_PATH=/tmp/biteafruit.xlsx,EXCEL_S3_BUCKET=${WORKBOOK_BUCKET},EXCEL_S3_KEY=${WORKBOOK_KEY},ALLOW_UNSAFE_EXCEL_S3=false,RAZORPAY_KEY_ID=,RAZORPAY_KEY_SECRET=,CLOUDINARY_URL=,GOOGLE_CLIENT_ID=}"

if aws lambda get-function --function-name "${FUNCTION_NAME}" --region "${REGION}" >/dev/null 2>&1; then
  echo "Updating Lambda function code..."
  aws lambda update-function-code \
    --function-name "${FUNCTION_NAME}" \
    --zip-file "fileb://${ZIP_FILE}" \
    --region "${REGION}" >/dev/null

  aws lambda wait function-updated \
    --function-name "${FUNCTION_NAME}" \
    --region "${REGION}"

  echo "Updating Lambda configuration..."
  aws lambda update-function-configuration \
    --function-name "${FUNCTION_NAME}" \
    --runtime python3.11 \
    --handler app.main.handler \
    --role "${ROLE_ARN}" \
    --timeout 30 \
    --memory-size 1024 \
    --environment "${ENV_VARS}" \
    --region "${REGION}" >/dev/null
else
  echo "Creating Lambda function..."
  aws lambda create-function \
    --function-name "${FUNCTION_NAME}" \
    --runtime python3.11 \
    --role "${ROLE_ARN}" \
    --handler app.main.handler \
    --zip-file "fileb://${ZIP_FILE}" \
    --timeout 30 \
    --memory-size 1024 \
    --environment "${ENV_VARS}" \
    --region "${REGION}" >/dev/null
fi

aws lambda wait function-active \
  --function-name "${FUNCTION_NAME}" \
  --region "${REGION}"

API_ID="$(aws apigatewayv2 get-apis \
  --region "${REGION}" \
  --query "Items[?Name=='${API_NAME}'].ApiId | [0]" \
  --output text)"

if [[ "${API_ID}" == "None" || -z "${API_ID}" ]]; then
  echo "Creating HTTP API..."
  API_ID="$(aws apigatewayv2 create-api \
    --name "${API_NAME}" \
    --protocol-type HTTP \
    --cors-configuration "AllowOrigins=${FRONTEND_ORIGIN},AllowMethods=GET,POST,PATCH,OPTIONS,AllowHeaders=Content-Type,Authorization,AllowCredentials=true" \
    --region "${REGION}" \
    --query ApiId \
    --output text)"
else
  echo "HTTP API ${API_NAME} already exists: ${API_ID}"
  aws apigatewayv2 update-api \
    --api-id "${API_ID}" \
    --cors-configuration "AllowOrigins=${FRONTEND_ORIGIN},AllowMethods=GET,POST,PATCH,OPTIONS,AllowHeaders=Content-Type,Authorization,AllowCredentials=true" \
    --region "${REGION}" >/dev/null
fi

INTEGRATION_ID="$(aws apigatewayv2 get-integrations \
  --api-id "${API_ID}" \
  --region "${REGION}" \
  --query "Items[?IntegrationUri=='${LAMBDA_ARN}'].IntegrationId | [0]" \
  --output text)"

if [[ "${INTEGRATION_ID}" == "None" || -z "${INTEGRATION_ID}" ]]; then
  INTEGRATION_ID="$(aws apigatewayv2 create-integration \
    --api-id "${API_ID}" \
    --integration-type AWS_PROXY \
    --integration-uri "${LAMBDA_ARN}" \
    --payload-format-version 2.0 \
    --region "${REGION}" \
    --query IntegrationId \
    --output text)"
fi

for ROUTE_KEY in 'ANY /{proxy+}' 'ANY /'; do
  ROUTE_EXISTS="$(aws apigatewayv2 get-routes \
    --api-id "${API_ID}" \
    --region "${REGION}" \
    --query "Items[?RouteKey=='${ROUTE_KEY}'].RouteId | [0]" \
    --output text)"

  if [[ "${ROUTE_EXISTS}" == "None" || -z "${ROUTE_EXISTS}" ]]; then
    aws apigatewayv2 create-route \
      --api-id "${API_ID}" \
      --route-key "${ROUTE_KEY}" \
      --target "integrations/${INTEGRATION_ID}" \
      --region "${REGION}" >/dev/null
  fi
done

STAGE_EXISTS="$(aws apigatewayv2 get-stages \
  --api-id "${API_ID}" \
  --region "${REGION}" \
  --query "Items[?StageName=='\$default'].StageName | [0]" \
  --output text)"

if [[ "${STAGE_EXISTS}" == "None" || -z "${STAGE_EXISTS}" ]]; then
  aws apigatewayv2 create-stage \
    --api-id "${API_ID}" \
    --stage-name '$default' \
    --auto-deploy \
    --region "${REGION}" >/dev/null
fi

aws lambda add-permission \
  --function-name "${FUNCTION_NAME}" \
  --statement-id AllowHttpApiInvoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*/*" \
  --region "${REGION}" >/dev/null 2>&1 || true

API_URL="$(aws apigatewayv2 get-api \
  --api-id "${API_ID}" \
  --region "${REGION}" \
  --query ApiEndpoint \
  --output text)"

echo
echo "Deploy complete."
echo "API URL: ${API_URL}"
echo "Health check: ${API_URL}/health"
