# Bite a Fruit

Modern full-stack fruit bowl subscription platform for Weight Loss and Weight Gain programs.

## Stack

- Frontend: React, Vite, Tailwind CSS, shadcn-style components
- Backend: FastAPI, JWT auth
- Database: Excel workbook (`.xlsx`) with one sheet per table
- Storage-ready: Cloudinary/AWS S3 integration points
- Payments-ready: Razorpay/UPI integration points
- Deployment: Vercel frontend, Render/Railway backend

## Project Structure

```text
BiteAfruit/
  backend/          FastAPI API, database models, seed data
  frontend/         React app with landing page and role dashboards
  database/         Excel workbook notes and optional schema references
  docs/             Deployment notes and WhatsApp templates
```

## Quick Start

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python seed.py
uvicorn app.main:app --reload
```

The API will run on `http://localhost:8000`.

The Excel database is created at `backend/data/biteafruit.xlsx`. You can open it in Excel to view or edit users, plans, subscriptions, deliveries, payments, inventory, and reports data.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will run on `http://localhost:5173`.

## Demo Accounts

Seed data creates these users:

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@biteafruit.com | password123 |
| Customer | customer@biteafruit.com | password123 |
| Delivery Partner | delivery@biteafruit.com | password123 |

## Key Features

- Role-based dashboards for admin, customer, and delivery partners
- Excel workbook database with sheets for users, profiles, plans, subscriptions, deliveries, payments, inventory, WhatsApp messages, notifications, and support tickets
- Weight Loss and Weight Gain subscription plans
- Customer health profile and weight progress tracking
- Monday-Friday delivery calendar and status management
- Add-ons, Razorpay payments, invoices, inventory alerts, reports
- WhatsApp automation message templates
- Multi-language-ready content structure, dark mode, SEO/PWA setup

## Razorpay Setup

Add your Razorpay test or live keys in `backend/.env`:

```text
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxx
```

Restart the backend after changing keys. The frontend Razorpay button creates an order, opens Razorpay Checkout, verifies the returned signature on the backend, and then saves the confirmed payment in the Excel workbook.
