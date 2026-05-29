from datetime import date, datetime, timedelta

import hmac
import hashlib
import logging
import time
from pathlib import Path

import requests
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from mangum import Mangum

from app.config import settings
from app.logging_config import configure_logging
from app.deps import get_current_user, require_roles
from app.enums import DeliveryStatus, PaymentStatus, SubscriptionStatus, UserRole
from app.excel_db import store
from app.schemas import (
    AdminCustomerCreate,
    CustomerProfileRead,
    CustomerProfileUpsert,
    DeliveryRead,
    DeliveryUpdate,
    ForgotPasswordRequest,
    GoogleLoginRequest,
    HealthLogCreate,
    HealthLogRead,
    LoginRequest,
    PaymentCreate,
    PaymentRead,
    PhoneOtpRequest,
    PlanRead,
    RazorpayOrderCreate,
    RazorpayOrderRead,
    RazorpayPaymentVerify,
    SubscriptionCreate,
    SubscriptionRead,
    TokenResponse,
    AdminUserCreate,
    UserCreate,
    UserRead,
)
from app.security import create_access_token, hash_password, verify_password


configure_logging()
logger = logging.getLogger(__name__)

store.setup()
logger.info(
    "Backend started",
    extra={
        "environment": settings.environment,
        "excel_storage": "s3" if store.s3_enabled() else "local",
        "excel_s3_uri": store.s3_uri(),
    },
)

app = FastAPI(title=settings.app_name, version="1.0.0")

frontend_origins = [
    origin.strip()
    for origin in settings.frontend_origin.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=(
        frontend_origins
        if settings.is_production
        else frontend_origins
        + [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://0.0.0.0:5173",
        ]
    ),
    allow_origin_regex=None if settings.is_production else r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = None
    try:
        response = await call_next(request)
        return response
    finally:
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        status_code = response.status_code if response else 500
        logger.info(
            "HTTP request completed",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": status_code,
                "duration_ms": duration_ms,
            },
        )


def with_plan(subscription: dict) -> dict:
    plan = store.get("subscription_plans", subscription["plan_id"])
    return {**subscription, "plan": plan}


def complete_expired_subscriptions() -> list[dict]:
    today = date.today()
    completed = []
    for subscription in store.all("subscriptions"):
        if (
            subscription.get("status") == SubscriptionStatus.active.value
            and subscription.get("end_date")
            and subscription["end_date"] < today
        ):
            updated = store.update(
                "subscriptions",
                subscription["id"],
                {"status": SubscriptionStatus.completed.value},
            )
            if updated:
                completed.append(updated)
                logger.info("Subscription completed after end date", extra={"subscription_id": updated["id"]})
    return completed


def active_plans() -> list[dict]:
    return [plan for plan in store.all("subscription_plans") if plan.get("is_active")]


def subscription_amount(subscription: dict) -> float:
    plan = store.get("subscription_plans", subscription["plan_id"])
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return float(plan["final_price"])


def validate_payment_amount(subscription: dict, amount: float) -> None:
    expected_amount = subscription_amount(subscription)
    if round(float(amount), 2) != round(expected_amount, 2):
        raise HTTPException(status_code=400, detail="Payment amount does not match subscription plan")


@app.on_event("startup")
def ensure_seed_data() -> None:
    if settings.is_production:
        logger.info("Skipping demo seed in production")
        return
    logger.info("Ensuring demo seed data")
    store.seed()


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": settings.app_name,
        "database": str(settings.excel_database_cache_path),
        "excel_storage": "s3" if store.s3_enabled() else "local",
        "excel_s3_uri": store.s3_uri(),
    }


@app.post("/auth/register", response_model=TokenResponse)
def register(payload: UserCreate) -> TokenResponse:
    existing = store.find_one("users", email=payload.email)
    if existing:
        logger.info("Registration rejected because email already exists", extra={"email": payload.email})
        raise HTTPException(status_code=409, detail="Email already registered")
    user = store.insert(
        "users",
        {
            "full_name": payload.full_name,
            "email": payload.email,
            "mobile_number": payload.mobile_number,
            "role": UserRole.customer.value,
            "password_hash": hash_password(payload.password),
            "is_active": True,
            "created_at": datetime.utcnow(),
        },
    )
    token = create_access_token(str(user["id"]), user["role"])
    logger.info("User registered", extra={"user_id": user["id"], "role": user["role"]})
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))


@app.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    user = store.find_one("users", email=payload.email)
    if not user or not verify_password(payload.password, user["password_hash"]):
        logger.info("Login failed", extra={"email": payload.email})
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    token = create_access_token(str(user["id"]), user["role"])
    logger.info("Login succeeded", extra={"user_id": user["id"], "role": user["role"]})
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))


@app.post("/auth/google", response_model=TokenResponse)
def google_login(payload: GoogleLoginRequest) -> TokenResponse:
    if not settings.google_client_id:
        logger.info("Google login attempted while provider is not configured")
        raise HTTPException(status_code=503, detail="Google login is not configured")
    try:
        response = requests.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": payload.id_token},
            timeout=10,
        )
    except requests.RequestException as exc:
        logger.warning("Google token verification request failed", exc_info=True)
        raise HTTPException(status_code=502, detail="Unable to verify Google token") from exc
    if response.status_code >= 400:
        logger.info("Google login rejected by tokeninfo", extra={"status_code": response.status_code})
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")
    token_info = response.json()
    if token_info.get("aud") != settings.google_client_id or token_info.get("email_verified") != "true":
        logger.info("Google login rejected by token claims")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")

    email = token_info.get("email")
    if not email:
        logger.info("Google login rejected because token had no email")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google token is missing email")
    user = store.find_one("users", email=email)
    created = False
    if not user:
        created = True
        user = store.insert(
            "users",
            {
                "full_name": token_info.get("name") or email.split("@")[0],
                "email": email,
                "role": UserRole.customer.value,
                "password_hash": hash_password(token_info["sub"]),
                "is_active": True,
                "created_at": datetime.utcnow(),
            },
        )
    token = create_access_token(str(user["id"]), user["role"])
    logger.info("Google login succeeded", extra={"user_id": user["id"], "created": created})
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))


@app.post("/auth/phone/request-otp")
def request_phone_otp(payload: PhoneOtpRequest) -> dict:
    _ = payload
    logger.info("Phone OTP requested while provider is not configured")
    raise HTTPException(status_code=503, detail="Phone OTP provider is not configured")


@app.post("/auth/forgot-password")
def forgot_password(payload: ForgotPasswordRequest) -> dict:
    logger.info("Forgot password requested", extra={"email": payload.email})
    user = store.find_one("users", email=payload.email)
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")
    store.update("users", user["id"], {"password_hash": hash_password(payload.new_password)})
    logger.info("Password reset completed", extra={"user_id": user["id"]})
    return {"message": "Password updated. You can login with your new password.", "email": payload.email}


@app.get("/users/me", response_model=UserRead)
def me(current_user: dict = Depends(get_current_user)) -> dict:
    return current_user


@app.get("/plans", response_model=list[PlanRead])
def list_plans() -> list[dict]:
    return active_plans()


@app.post("/profiles/me", response_model=CustomerProfileRead)
def upsert_profile(
    payload: CustomerProfileUpsert,
    current_user: dict = Depends(require_roles(UserRole.customer)),
) -> dict:
    profile = store.find_one("customer_profiles", user_id=current_user["id"])
    values = payload.model_dump()
    if profile is None:
        logger.info("Creating customer profile", extra={"user_id": current_user["id"]})
        return store.insert("customer_profiles", {"user_id": current_user["id"], **values})
    updated = store.update("customer_profiles", profile["id"], values)
    if not updated:
        logger.warning("Customer profile update failed", extra={"profile_id": profile["id"]})
        raise HTTPException(status_code=404, detail="Profile not found")
    logger.info("Customer profile updated", extra={"profile_id": profile["id"], "user_id": current_user["id"]})
    return updated


@app.get("/profiles/me", response_model=CustomerProfileRead)
def get_profile(current_user: dict = Depends(require_roles(UserRole.customer))) -> dict:
    profile = store.find_one("customer_profiles", user_id=current_user["id"])
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@app.post("/subscriptions", response_model=SubscriptionRead)
def create_subscription(
    payload: SubscriptionCreate,
    current_user: dict = Depends(require_roles(UserRole.customer)),
) -> dict:
    complete_expired_subscriptions()
    plan = store.get("subscription_plans", payload.plan_id)
    if not plan:
        logger.info("Subscription creation rejected because plan was not found", extra={"plan_id": payload.plan_id})
        raise HTTPException(status_code=404, detail="Plan not found")
    active_subscription = next(
        (
            subscription
            for subscription in store.filter("subscriptions", customer_id=current_user["id"])
            if subscription.get("plan_id") == plan["id"] and subscription.get("status") == SubscriptionStatus.active.value
        ),
        None,
    )
    if active_subscription:
        raise HTTPException(status_code=409, detail="You already have an active subscription for this plan")
    partner = next((user for user in store.all("users") if user.get("role") == UserRole.delivery_partner.value), None)
    subscription = store.insert(
        "subscriptions",
        {
            "customer_id": current_user["id"],
            "plan_id": plan["id"],
            "selected_addons": payload.selected_addons,
            "start_date": payload.start_date,
            "end_date": payload.start_date + timedelta(days=int(plan["duration_days"]) - 1),
            "status": SubscriptionStatus.active.value,
            "renewed_from_subscription_id": None,
            "created_at": datetime.utcnow(),
        },
    )
    store.create_weekday_deliveries(subscription, partner["id"] if partner else None)
    logger.info(
        "Subscription created",
        extra={"subscription_id": subscription["id"], "customer_id": current_user["id"], "plan_id": plan["id"]},
    )
    return with_plan(subscription)


@app.get("/subscriptions/me", response_model=list[SubscriptionRead])
def my_subscriptions(current_user: dict = Depends(require_roles(UserRole.customer))) -> list[dict]:
    complete_expired_subscriptions()
    subscriptions = store.filter("subscriptions", customer_id=current_user["id"])
    return [with_plan(subscription) for subscription in subscriptions]


@app.post("/subscriptions/{subscription_id}/renew", response_model=SubscriptionRead)
def renew_subscription(
    subscription_id: int,
    current_user: dict = Depends(require_roles(UserRole.customer)),
) -> dict:
    complete_expired_subscriptions()
    previous = store.get("subscriptions", subscription_id)
    if not previous or previous["customer_id"] != current_user["id"]:
        raise HTTPException(status_code=404, detail="Subscription not found")
    if previous["status"] != SubscriptionStatus.completed.value:
        raise HTTPException(status_code=400, detail="Only completed subscriptions can be renewed")

    plan = store.get("subscription_plans", previous["plan_id"])
    if not plan or not plan.get("is_active"):
        raise HTTPException(status_code=400, detail="Subscription plan is no longer available")

    active_subscription = next(
        (
            subscription
            for subscription in store.filter("subscriptions", customer_id=current_user["id"])
            if subscription.get("plan_id") == plan["id"] and subscription.get("status") == SubscriptionStatus.active.value
        ),
        None,
    )
    if active_subscription:
        raise HTTPException(status_code=409, detail="You already have an active renewal for this plan")

    start_date = max(date.today(), previous["end_date"] + timedelta(days=1))
    partner = next((user for user in store.all("users") if user.get("role") == UserRole.delivery_partner.value), None)
    renewed = store.insert(
        "subscriptions",
        {
            "customer_id": current_user["id"],
            "plan_id": plan["id"],
            "selected_addons": previous.get("selected_addons") or [],
            "start_date": start_date,
            "end_date": start_date + timedelta(days=int(plan["duration_days"]) - 1),
            "status": SubscriptionStatus.active.value,
            "renewed_from_subscription_id": previous["id"],
            "created_at": datetime.utcnow(),
        },
    )
    store.create_weekday_deliveries(renewed, partner["id"] if partner else None)
    logger.info(
        "Subscription renewed",
        extra={
            "subscription_id": renewed["id"],
            "renewed_from_subscription_id": previous["id"],
            "customer_id": current_user["id"],
        },
    )
    return with_plan(renewed)


@app.patch("/subscriptions/{subscription_id}/pause", response_model=SubscriptionRead)
def pause_subscription(
    subscription_id: int,
    current_user: dict = Depends(require_roles(UserRole.customer, UserRole.admin)),
) -> dict:
    subscription = store.get("subscriptions", subscription_id)
    if not subscription or (current_user["role"] == UserRole.customer.value and subscription["customer_id"] != current_user["id"]):
        logger.info("Pause subscription rejected", extra={"subscription_id": subscription_id, "user_id": current_user["id"]})
        raise HTTPException(status_code=404, detail="Subscription not found")
    updated = store.update(
        "subscriptions",
        subscription_id,
        {"status": SubscriptionStatus.paused.value, "pause_from": date.today()},
    )
    logger.info("Subscription paused", extra={"subscription_id": subscription_id, "user_id": current_user["id"]})
    return with_plan(updated)


@app.patch("/subscriptions/{subscription_id}/resume", response_model=SubscriptionRead)
def resume_subscription(
    subscription_id: int,
    current_user: dict = Depends(require_roles(UserRole.customer, UserRole.admin)),
) -> dict:
    subscription = store.get("subscriptions", subscription_id)
    if not subscription or (current_user["role"] == UserRole.customer.value and subscription["customer_id"] != current_user["id"]):
        logger.info("Resume subscription rejected", extra={"subscription_id": subscription_id, "user_id": current_user["id"]})
        raise HTTPException(status_code=404, detail="Subscription not found")
    updated = store.update(
        "subscriptions",
        subscription_id,
        {"status": SubscriptionStatus.active.value, "pause_to": date.today()},
    )
    logger.info("Subscription resumed", extra={"subscription_id": subscription_id, "user_id": current_user["id"]})
    return with_plan(updated)


@app.patch("/subscriptions/{subscription_id}/complete", response_model=SubscriptionRead)
def complete_subscription(
    subscription_id: int,
    current_user: dict = Depends(require_roles(UserRole.admin)),
) -> dict:
    subscription = store.get("subscriptions", subscription_id)
    if not subscription:
        logger.info("Complete subscription rejected", extra={"subscription_id": subscription_id, "user_id": current_user["id"]})
        raise HTTPException(status_code=404, detail="Subscription not found")
    if subscription["status"] == SubscriptionStatus.completed.value:
        return with_plan(subscription)

    paid_payment = next(
        (
            payment
            for payment in store.filter("payments", subscription_id=subscription_id)
            if payment.get("status") == PaymentStatus.paid.value
        ),
        None,
    )
    if not paid_payment:
        raise HTTPException(status_code=400, detail="Cannot complete subscription until payment is paid")

    updated = store.update(
        "subscriptions",
        subscription_id,
        {"status": SubscriptionStatus.completed.value, "pause_to": date.today()},
    )
    logger.info("Subscription completed by admin", extra={"subscription_id": subscription_id, "user_id": current_user["id"]})
    return with_plan(updated)


@app.post("/health-logs", response_model=HealthLogRead)
def create_health_log(
    payload: HealthLogCreate,
    current_user: dict = Depends(require_roles(UserRole.customer)),
) -> dict:
    log = store.insert("health_logs", {"customer_id": current_user["id"], **payload.model_dump()})
    logger.info("Health log created", extra={"health_log_id": log["id"], "customer_id": current_user["id"]})
    return log


@app.get("/health-logs/me")
def my_progress(current_user: dict = Depends(require_roles(UserRole.customer))) -> dict:
    logs = sorted(store.filter("health_logs", customer_id=current_user["id"]), key=lambda item: item["log_date"])
    if not logs:
        return {"logs": [], "average_weight_change": 0, "goal_progress_percentage": 0}
    profile = store.find_one("customer_profiles", user_id=current_user["id"])
    start = logs[0]["weight_kg"]
    latest = logs[-1]["weight_kg"]
    goal = profile.get("goal_weight_kg") if profile else None
    progress = 0
    if goal and start != goal:
        progress = abs((latest - start) / (goal - start)) * 100
    return {
        "logs": [HealthLogRead.model_validate(log).model_dump() for log in logs],
        "average_weight_change": round(latest - start, 2),
        "goal_progress_percentage": round(min(progress, 100), 1),
    }


@app.get("/deliveries/me", response_model=list[DeliveryRead])
def my_deliveries(current_user: dict = Depends(require_roles(UserRole.customer, UserRole.delivery_partner))) -> list[dict]:
    if current_user["role"] == UserRole.delivery_partner.value:
        deliveries = store.filter("deliveries", delivery_partner_id=current_user["id"])
    else:
        deliveries = store.filter("deliveries", customer_id=current_user["id"])
    return sorted(deliveries, key=lambda item: item["delivery_date"])


@app.patch("/deliveries/{delivery_id}", response_model=DeliveryRead)
def update_delivery(
    delivery_id: int,
    payload: DeliveryUpdate,
    current_user: dict = Depends(require_roles(UserRole.delivery_partner, UserRole.admin)),
) -> dict:
    delivery = store.get("deliveries", delivery_id)
    if not delivery:
        logger.info("Delivery update rejected because delivery was not found", extra={"delivery_id": delivery_id})
        raise HTTPException(status_code=404, detail="Delivery not found")
    if (
        current_user["role"] == UserRole.delivery_partner.value
        and delivery.get("delivery_partner_id") != current_user["id"]
    ):
        logger.info("Delivery update rejected because user is not assigned", extra={"delivery_id": delivery_id, "user_id": current_user["id"]})
        raise HTTPException(status_code=404, detail="Delivery not found")
    updated = store.update(
        "deliveries",
        delivery_id,
        {
            "status": payload.status.value,
            "notes": payload.notes,
            "confirmation_photo_url": payload.confirmation_photo_url,
        },
    )
    logger.info("Delivery updated", extra={"delivery_id": delivery_id, "user_id": current_user["id"], "status": payload.status.value})
    return updated


@app.post("/payments", response_model=PaymentRead)
def create_payment(
    payload: PaymentCreate,
    current_user: dict = Depends(require_roles(UserRole.customer)),
) -> dict:
    subscription = store.get("subscriptions", payload.subscription_id)
    if not subscription or subscription["customer_id"] != current_user["id"]:
        logger.info(
            "Payment creation rejected because subscription was not found",
            extra={"subscription_id": payload.subscription_id, "user_id": current_user["id"]},
        )
        raise HTTPException(status_code=404, detail="Subscription not found")
    validate_payment_amount(subscription, payload.amount)
    payment = store.insert(
        "payments",
        {
            "customer_id": current_user["id"],
            "status": PaymentStatus.pending.value,
            "paid_at": None,
            "created_at": datetime.utcnow(),
            **{
                **payload.model_dump(),
                "transaction_reference": payload.transaction_reference
                or f"{payload.method.upper()}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            },
        },
    )
    logger.info(
        "Payment created",
        extra={"payment_id": payment["id"], "subscription_id": payload.subscription_id, "customer_id": current_user["id"]},
    )
    return payment


@app.patch("/payments/{payment_id}/mark-paid", response_model=PaymentRead)
def mark_payment_paid(
    payment_id: int,
    current_user: dict = Depends(require_roles(UserRole.admin)),
) -> dict:
    payment = store.get("payments", payment_id)
    if not payment:
        logger.info("Mark payment paid rejected", extra={"payment_id": payment_id, "user_id": current_user["id"]})
        raise HTTPException(status_code=404, detail="Payment not found")
    updated = store.update(
        "payments",
        payment_id,
        {"status": PaymentStatus.paid.value, "paid_at": datetime.utcnow()},
    )
    logger.info("Payment marked paid by admin", extra={"payment_id": payment_id, "user_id": current_user["id"]})
    return updated


@app.post("/payments/razorpay/order", response_model=RazorpayOrderRead)
def create_razorpay_order(
    payload: RazorpayOrderCreate,
    current_user: dict = Depends(require_roles(UserRole.customer)),
) -> dict:
    subscription = store.get("subscriptions", payload.subscription_id)
    if not subscription or subscription["customer_id"] != current_user["id"]:
        logger.info(
            "Razorpay order rejected because subscription was not found",
            extra={"subscription_id": payload.subscription_id, "user_id": current_user["id"]},
        )
        raise HTTPException(status_code=404, detail="Subscription not found")
    validate_payment_amount(subscription, payload.amount)

    amount_paise = int(round(payload.amount * 100))
    receipt = f"sub_{subscription['id']}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    if not settings.razorpay_key_id or not settings.razorpay_key_secret:
        logger.info("Razorpay order requested while provider is not configured")
        raise HTTPException(status_code=503, detail="Razorpay is not configured")

    try:
        response = requests.post(
            "https://api.razorpay.com/v1/orders",
            auth=(settings.razorpay_key_id, settings.razorpay_key_secret),
            json={
                "amount": amount_paise,
                "currency": "INR",
                "receipt": receipt,
                "notes": {
                    "subscription_id": str(subscription["id"]),
                    "customer_id": str(current_user["id"]),
                },
            },
            timeout=15,
        )
    except requests.RequestException as exc:
        logger.warning("Razorpay order request failed", exc_info=True)
        raise HTTPException(status_code=502, detail=f"Unable to reach Razorpay: {exc}") from exc

    if response.status_code >= 400:
        logger.warning("Razorpay order rejected by provider", extra={"status_code": response.status_code})
        raise HTTPException(status_code=502, detail=response.json() if response.content else "Razorpay order failed")

    order = response.json()
    logger.info("Razorpay order created", extra={"subscription_id": subscription["id"], "razorpay_order_id": order["id"]})
    return {
        "key_id": settings.razorpay_key_id,
        "order_id": order["id"],
        "amount": order["amount"],
        "currency": order["currency"],
        "name": settings.app_name,
        "description": "Fruit bowl subscription",
        "customer_name": current_user["full_name"],
        "customer_email": current_user["email"],
        "customer_contact": current_user.get("mobile_number"),
        "demo_mode": False,
    }


@app.post("/payments/razorpay/verify", response_model=PaymentRead)
def verify_razorpay_payment(
    payload: RazorpayPaymentVerify,
    current_user: dict = Depends(require_roles(UserRole.customer)),
) -> dict:
    subscription = store.get("subscriptions", payload.subscription_id)
    if not subscription or subscription["customer_id"] != current_user["id"]:
        logger.info(
            "Razorpay verification rejected because subscription was not found",
            extra={"subscription_id": payload.subscription_id, "user_id": current_user["id"]},
        )
        raise HTTPException(status_code=404, detail="Subscription not found")
    validate_payment_amount(subscription, payload.amount)

    if not settings.razorpay_key_secret:
        logger.error("Razorpay verification requested without configured secret")
        raise HTTPException(status_code=500, detail="Razorpay secret is not configured")
    if payload.razorpay_order_id.startswith("order_demo_"):
        logger.info("Demo Razorpay order verification rejected")
        raise HTTPException(status_code=400, detail="Demo Razorpay orders are not accepted")
    message = f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}".encode("utf-8")
    expected_signature = hmac.new(
        settings.razorpay_key_secret.encode("utf-8"),
        message,
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected_signature, payload.razorpay_signature):
        logger.info("Razorpay signature verification failed", extra={"subscription_id": payload.subscription_id})
        raise HTTPException(status_code=400, detail="Invalid Razorpay payment signature")

    payment = store.insert(
        "payments",
        {
            "subscription_id": payload.subscription_id,
            "customer_id": current_user["id"],
            "amount": payload.amount,
            "method": "Razorpay",
            "status": PaymentStatus.paid.value,
            "transaction_reference": payload.razorpay_payment_id,
            "paid_at": datetime.utcnow(),
            "created_at": datetime.utcnow(),
        },
    )
    logger.info(
        "Razorpay payment verified",
        extra={"payment_id": payment["id"], "subscription_id": payload.subscription_id, "customer_id": current_user["id"]},
    )
    return payment


@app.get("/payments/me", response_model=list[PaymentRead])
def my_payments(current_user: dict = Depends(require_roles(UserRole.customer))) -> list[dict]:
    return store.filter("payments", customer_id=current_user["id"])


@app.get("/admin/dashboard")
def admin_dashboard(current_user: dict = Depends(require_roles(UserRole.admin))) -> dict:
    complete_expired_subscriptions()
    logger.info("Admin dashboard requested", extra={"user_id": current_user["id"]})
    users = store.all("users")
    subscriptions = store.all("subscriptions")
    payments = store.all("payments")
    deliveries = store.all("deliveries")
    inventory = store.all("inventory")
    paid_revenue = sum(payment["amount"] or 0 for payment in payments if payment.get("status") == PaymentStatus.paid.value)
    delivered = len([delivery for delivery in deliveries if delivery.get("status") == DeliveryStatus.delivered.value])
    success_rate = round((delivered / len(deliveries)) * 100, 1) if deliveries else 0
    today = date.today()
    ending_window = today + timedelta(days=5)
    user_by_id = {user["id"]: user for user in users}
    plan_by_id = {plan["id"]: plan for plan in store.all("subscription_plans")}
    active_customers_by_product = {}
    for subscription in subscriptions:
        if subscription.get("status") != SubscriptionStatus.active.value:
            continue
        plan = plan_by_id.get(subscription.get("plan_id"), {})
        product_name = plan.get("name") or "Unknown Product"
        if product_name not in active_customers_by_product:
            active_customers_by_product[product_name] = {
                "product_name": product_name,
                "goal": plan.get("goal") or "",
                "active_customers": 0,
            }
        active_customers_by_product[product_name]["active_customers"] += 1
    subscriptions_ending_soon = [
        {
            "subscription_id": subscription["id"],
            "customer_id": subscription["customer_id"],
            "customer_name": user_by_id.get(subscription["customer_id"], {}).get("full_name", "Unknown customer"),
            "customer_email": user_by_id.get(subscription["customer_id"], {}).get("email"),
            "plan_name": plan_by_id.get(subscription["plan_id"], {}).get("name", "Unknown plan"),
            "end_date": subscription["end_date"],
            "days_remaining": (subscription["end_date"] - today).days,
        }
        for subscription in subscriptions
        if subscription.get("status") == SubscriptionStatus.active.value
        and subscription.get("end_date")
        and today <= subscription["end_date"] <= ending_window
    ]
    return {
        "monthly_recurring_revenue": paid_revenue,
        "total_customers": len([user for user in users if user.get("role") == UserRole.customer.value]),
        "active_subscriptions": len([sub for sub in subscriptions if sub.get("status") == SubscriptionStatus.active.value]),
        "active_customers_by_product": sorted(
            active_customers_by_product.values(),
            key=lambda item: (-item["active_customers"], item["product_name"]),
        ),
        "pending_payments": len([payment for payment in payments if payment.get("status") == PaymentStatus.pending.value]),
        "delivery_success_rate": success_rate,
        "customer_retention_rate": 88,
        "customer_satisfaction_score": 4.8,
        "low_stock_alerts": [
            {"item_name": item["item_name"], "quantity": item["quantity"], "unit": item["unit"]}
            for item in inventory
            if item["quantity"] <= item["low_stock_threshold"]
        ],
        "subscriptions_ending_soon": sorted(subscriptions_ending_soon, key=lambda item: item["end_date"]),
    }


@app.get("/admin/inventory")
def inventory(current_user: dict = Depends(require_roles(UserRole.admin))) -> list[dict]:
    logger.info("Admin inventory requested", extra={"user_id": current_user["id"]})
    return [
        {
            **item,
            "low_stock": item["quantity"] <= item["low_stock_threshold"],
        }
        for item in sorted(store.all("inventory"), key=lambda row: row["item_name"])
    ]


@app.post("/admin/users", response_model=UserRead)
def admin_create_user(
    payload: AdminUserCreate,
    current_user: dict = Depends(require_roles(UserRole.admin)),
) -> dict:
    existing = store.find_one("users", email=payload.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = store.insert(
        "users",
        {
            "full_name": payload.full_name,
            "email": payload.email,
            "mobile_number": payload.mobile_number,
            "role": payload.role.value,
            "password_hash": hash_password(payload.password),
            "is_active": payload.is_active,
            "created_at": datetime.utcnow(),
        },
    )
    logger.info("Admin created user", extra={"created_user_id": user["id"], "role": user["role"], "admin_id": current_user["id"]})
    return user


@app.post("/admin/customers")
def admin_create_customer(
    payload: AdminCustomerCreate,
    current_user: dict = Depends(require_roles(UserRole.admin)),
) -> dict:
    existing = store.find_one("users", email=payload.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    plan = store.get("subscription_plans", payload.plan_id) if payload.plan_id else None
    if payload.plan_id and not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    user = store.insert(
        "users",
        {
            "full_name": payload.full_name,
            "email": payload.email,
            "mobile_number": payload.mobile_number,
            "role": UserRole.customer.value,
            "password_hash": hash_password(payload.password),
            "is_active": payload.is_active,
            "created_at": datetime.utcnow(),
        },
    )
    profile_values = {
        field_name: getattr(payload, field_name)
        for field_name in CustomerProfileUpsert.model_fields
    }
    profile = store.insert("customer_profiles", {"user_id": user["id"], **profile_values})
    subscription = None
    if plan:
        subscription_start = payload.start_date or date.today()
        partner = next((user for user in store.all("users") if user.get("role") == UserRole.delivery_partner.value), None)
        subscription = store.insert(
            "subscriptions",
            {
                "customer_id": user["id"],
                "plan_id": plan["id"],
                "selected_addons": payload.selected_addons,
                "start_date": subscription_start,
                "end_date": subscription_start + timedelta(days=int(plan["duration_days"]) - 1),
                "status": SubscriptionStatus.active.value,
                "renewed_from_subscription_id": None,
                "created_at": datetime.utcnow(),
            },
        )
        store.create_weekday_deliveries(subscription, partner["id"] if partner else None)
    logger.info(
        "Admin created customer",
        extra={
            "created_user_id": user["id"],
            "profile_id": profile["id"],
            "subscription_id": subscription["id"] if subscription else None,
            "admin_id": current_user["id"],
        },
    )
    return {
        "user": UserRead.model_validate(user).model_dump(),
        "profile": CustomerProfileRead.model_validate(profile).model_dump(),
        "subscription": with_plan(subscription) if subscription else None,
    }


@app.get("/admin/subscriptions")
def admin_subscriptions(current_user: dict = Depends(require_roles(UserRole.admin))) -> list[dict]:
    complete_expired_subscriptions()
    logger.info("Admin subscriptions requested", extra={"user_id": current_user["id"]})
    users = {user["id"]: user for user in store.all("users")}
    profiles = {profile["user_id"]: profile for profile in store.all("customer_profiles")}
    plans = {plan["id"]: plan for plan in store.all("subscription_plans")}
    payments = store.all("payments")
    rows = []

    for subscription in sorted(store.all("subscriptions"), key=lambda item: item["created_at"], reverse=True):
        customer = users.get(subscription["customer_id"], {})
        profile = profiles.get(subscription["customer_id"], {})
        plan = plans.get(subscription["plan_id"], {})
        subscription_payments = [
            payment for payment in payments if payment.get("subscription_id") == subscription["id"]
        ]
        latest_payment = max(
            subscription_payments,
            key=lambda payment: payment.get("created_at") or datetime.min,
            default=None,
        )
        rows.append(
            {
                "subscription_id": subscription["id"],
                "status": subscription["status"],
                "start_date": subscription.get("start_date"),
                "end_date": subscription.get("end_date"),
                "pause_from": subscription.get("pause_from"),
                "pause_to": subscription.get("pause_to"),
                "selected_addons": subscription.get("selected_addons") or [],
                "customer": {
                    "id": customer.get("id"),
                    "full_name": customer.get("full_name"),
                    "email": customer.get("email"),
                    "mobile_number": customer.get("mobile_number"),
                },
                "profile": {
                    "whatsapp_number": profile.get("whatsapp_number"),
                    "delivery_address": profile.get("delivery_address"),
                    "gps_location": profile.get("gps_location"),
                    "age": profile.get("age"),
                    "gender": profile.get("gender"),
                    "height_cm": profile.get("height_cm"),
                    "weight_kg": profile.get("weight_kg"),
                    "goal_weight_kg": profile.get("goal_weight_kg"),
                },
                "plan": {
                    "id": plan.get("id"),
                    "name": plan.get("name"),
                    "goal": plan.get("goal"),
                    "final_price": plan.get("final_price"),
                },
                "payment": latest_payment,
            }
        )

    return rows


@app.get("/admin/reports")
def reports(current_user: dict = Depends(require_roles(UserRole.admin))) -> dict:
    logger.info("Admin reports requested", extra={"user_id": current_user["id"]})
    dashboard = admin_dashboard(current_user)
    return {
        "sales_report": dashboard,
        "subscription_report": {
            "total": len(store.all("subscriptions")),
            "active": dashboard["active_subscriptions"],
        },
        "delivery_report": {"today": str(date.today()), "weekday_only": True, "total": len(store.all("deliveries"))},
        "customer_progress_report": {"logs": len(store.all("health_logs"))},
        "inventory_report": {"low_stock_alerts": dashboard["low_stock_alerts"]},
    }


@app.get("/admin/excel-database")
def download_excel_database(current_user: dict = Depends(require_roles(UserRole.admin))) -> FileResponse:
    workbook_path = settings.excel_database_cache_path
    if not workbook_path.exists():
        logger.info("Admin Excel download triggered seed because workbook was missing", extra={"user_id": current_user["id"]})
        store.seed()
    logger.info("Admin downloaded Excel workbook", extra={"user_id": current_user["id"], "path": str(workbook_path)})
    return FileResponse(
        workbook_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="biteafruit.xlsx",
    )


@app.post("/support")
def create_ticket(
    subject: str,
    message: str,
    current_user: dict = Depends(require_roles(UserRole.customer)),
) -> dict:
    ticket = store.insert(
        "support_tickets",
        {"customer_id": current_user["id"], "subject": subject, "message": message, "status": "open", "created_at": datetime.utcnow()},
    )
    logger.info("Support ticket created", extra={"ticket_id": ticket["id"], "customer_id": current_user["id"]})
    return {"message": "Support ticket created", "ticket_id": ticket["id"]}


@app.get("/ai/recommendations")
def ai_recommendations(current_user: dict = Depends(get_current_user)) -> dict:
    logger.info("AI recommendations requested", extra={"user_id": current_user["id"], "role": current_user["role"]})
    return {
        "personalized_fruit_recommendations": ["Papaya", "Guava", "Banana"],
        "weight_progress_prediction": "On track for meaningful progress over the next 4 weeks.",
        "smart_addon_suggestions": ["Sprouts", "Protein Mix"] if current_user["role"] == UserRole.customer.value else [],
        "renewal_prediction": "High renewal likelihood with consistent delivery completion.",
    }


handler = Mangum(app)
