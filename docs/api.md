# API Overview

Base URL: `http://localhost:8000`

## Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/google`
- `POST /auth/phone/request-otp`
- `POST /auth/forgot-password`
- `GET /users/me`

## Customer

- `GET /plans`
- `POST /profiles/me`
- `GET /profiles/me`
- `POST /subscriptions`
- `GET /subscriptions/me`
- `PATCH /subscriptions/{id}/pause`
- `PATCH /subscriptions/{id}/resume`
- `POST /health-logs`
- `GET /health-logs/me`
- `POST /payments`
- `POST /payments/razorpay/order`
- `POST /payments/razorpay/verify`
- `GET /payments/me`
- `POST /support`

## Delivery Partner

- `GET /deliveries/me`
- `PATCH /deliveries/{id}`

## Admin

- `GET /admin/dashboard`
- `GET /admin/inventory`
- `GET /admin/reports`
- `GET /admin/excel-database`

## AI

- `GET /ai/recommendations`
