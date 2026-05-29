# Deployment Guide

## Backend on Render or Railway

1. Use persistent disk/storage so the Excel workbook is not lost between deploys.
2. Set environment variables:

```text
JWT_SECRET=<strong-secret>
ENVIRONMENT=production
FRONTEND_ORIGIN=https://your-vercel-domain.vercel.app
EXCEL_DATABASE_PATH=data/biteafruit.xlsx
EXCEL_S3_BUCKET=<optional-for-lambda>
EXCEL_S3_KEY=biteafruit/biteafruit.xlsx
AWS_REGION=ap-south-1
RAZORPAY_KEY_ID=<optional>
RAZORPAY_KEY_SECRET=<optional>
CLOUDINARY_URL=<optional>
GOOGLE_CLIENT_ID=<optional>
```

3. Build command:

```bash
pip install -r requirements.txt
```

4. Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

5. For development or staging demos only, run seed once from the service shell:

```bash
python seed.py
```

Do not run the demo seed in production. It creates sample users for local testing, and the API disables automatic demo seeding when `ENVIRONMENT=production`.

## Backend on AWS Lambda with Serverless Framework

The FastAPI app includes a Lambda handler at `app.main.handler` using Mangum. The `backend/serverless.yml` file deploys it behind API Gateway HTTP API and stores the Excel workbook in S3.

1. Install Serverless deployment dependencies from the `backend` directory:

```bash
npm install
```

2. Set deployment environment variables:

```text
JWT_SECRET=<strong-secret-at-least-32-chars>
FRONTEND_ORIGIN=https://your-vercel-domain.vercel.app
AWS_REGION=ap-south-1
EXCEL_S3_BUCKET=<optional-custom-new-bucket-name>
EXCEL_S3_KEY=biteafruit/biteafruit.xlsx
RAZORPAY_KEY_ID=<optional>
RAZORPAY_KEY_SECRET=<optional>
CLOUDINARY_URL=<optional>
GOOGLE_CLIENT_ID=<optional>
```

If `EXCEL_S3_BUCKET` is not set, Serverless creates a retained private bucket named `biteafruit-workbook-<aws-account-id>-<stage>`. If you set `EXCEL_S3_BUCKET`, use a globally unique bucket name that CloudFormation can create for this stack.

3. Deploy a development/staging Lambda:

```bash
npm run deploy:dev
```

4. Deploy production only after accepting the Excel/S3 limitation or migrating storage:

```bash
set ALLOW_UNSAFE_EXCEL_S3=true
npm run deploy:prod
```

PowerShell equivalent:

```powershell
$env:ALLOW_UNSAFE_EXCEL_S3="true"
npm run deploy:prod
```

5. Use the API Gateway HTTP API URL printed by Serverless as the frontend `VITE_API_URL`.

The Serverless deployment grants the Lambda role `s3:GetObject` and `s3:PutObject` permission for the workbook object. The function uses `/tmp/biteafruit.xlsx` locally and syncs the workbook to S3.

This S3 workbook approach is best for low-traffic admin/demo usage. Concurrent writes from multiple Lambda instances can overwrite each other because the whole workbook is saved as one object. The app now refuses Excel-over-S3 in production unless `ALLOW_UNSAFE_EXCEL_S3=true` is set deliberately. For production traffic, migrate the sheets to DynamoDB or RDS.

## Frontend on Vercel

1. Import the `frontend` directory as the Vercel project root.
2. Set environment variable:

```text
VITE_API_URL=https://your-backend-service.example.com
```

3. Build command:

```bash
npm run build
```

4. Output directory:

```text
dist
```

## Production Notes

- Replace demo Google login with token verification using Google OAuth certificates.
- Razorpay order creation and signature verification are implemented; use test keys first, then switch to live keys after Razorpay go-live checks.
- Connect WhatsApp templates through Meta WhatsApp Cloud API or a provider such as Interakt/Twilio.
- Store progress photos and delivery confirmations in Cloudinary or S3.
- Excel files can be locked during writes; avoid opening the workbook in desktop Excel while the API is processing updates.
- For higher traffic, migrate the workbook sheets to a server database.
