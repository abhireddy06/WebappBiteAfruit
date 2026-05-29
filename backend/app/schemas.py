from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field

from app.enums import DeliveryStatus, PaymentStatus, SubscriptionStatus, UserRole


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=8)
    mobile_number: str | None = None


class AdminUserCreate(UserCreate):
    role: UserRole = UserRole.customer
    is_active: bool = True


class UserRead(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    mobile_number: str | None
    role: UserRole
    is_active: bool

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str = Field(min_length=8)


class PhoneOtpRequest(BaseModel):
    phone_number: str


class GoogleLoginRequest(BaseModel):
    id_token: str


class CustomerProfileUpsert(BaseModel):
    whatsapp_number: str | None = None
    delivery_address: str
    gps_location: str | None = None
    age: int | None = None
    gender: str | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    goal_weight_kg: float | None = None
    dietary_preferences: list[str] = []
    allergies: list[str] = []


class AdminCustomerCreate(UserCreate, CustomerProfileUpsert):
    is_active: bool = True
    plan_id: int | None = None
    selected_addons: list[str] = []
    start_date: date | None = None


class CustomerProfileRead(CustomerProfileUpsert):
    id: int
    user_id: int

    model_config = {"from_attributes": True}


class PlanRead(BaseModel):
    id: int
    name: str
    goal: str
    description: str
    duration_days: int
    delivery_days: list[str]
    fruits_included: list[str]
    optional_addons: list[str]
    price: float
    discount: float
    final_price: float
    image_url: str | None = None
    is_active: bool

    model_config = {"from_attributes": True}


class PlanCreate(BaseModel):
    name: str
    goal: str
    description: str
    duration_days: int = Field(gt=0)
    delivery_days: list[str] = []
    fruits_included: list[str] = []
    optional_addons: list[str] = []
    price: float = Field(ge=0)
    discount: float = Field(ge=0, default=0)
    final_price: float | None = Field(ge=0, default=None)
    image_url: str | None = None
    is_active: bool = True


class PlanUpdate(BaseModel):
    name: str | None = None
    goal: str | None = None
    description: str | None = None
    duration_days: int | None = Field(gt=0, default=None)
    delivery_days: list[str] | None = None
    fruits_included: list[str] | None = None
    optional_addons: list[str] | None = None
    price: float | None = Field(ge=0, default=None)
    discount: float | None = Field(ge=0, default=None)
    final_price: float | None = Field(ge=0, default=None)
    image_url: str | None = None
    is_active: bool | None = None


class SubscriptionCreate(BaseModel):
    plan_id: int
    selected_addons: list[str] = []
    start_date: date


class SubscriptionRead(BaseModel):
    id: int
    customer_id: int
    plan_id: int
    status: SubscriptionStatus
    selected_addons: list[str]
    start_date: date
    end_date: date
    renewed_from_subscription_id: int | None = None
    plan: PlanRead

    model_config = {"from_attributes": True}


class HealthLogCreate(BaseModel):
    log_date: date
    weight_kg: float
    progress_photo_url: str | None = None
    notes: str | None = None


class HealthLogRead(HealthLogCreate):
    id: int
    customer_id: int

    model_config = {"from_attributes": True}


class DeliveryRead(BaseModel):
    id: int
    subscription_id: int
    customer_id: int
    delivery_partner_id: int | None
    delivery_date: date
    status: DeliveryStatus
    route_order: int | None
    notes: str | None

    model_config = {"from_attributes": True}


class DeliveryUpdate(BaseModel):
    status: DeliveryStatus
    notes: str | None = None
    confirmation_photo_url: str | None = None


class PaymentCreate(BaseModel):
    subscription_id: int
    amount: float
    method: str
    transaction_reference: str | None = None


class PaymentRead(PaymentCreate):
    id: int
    customer_id: int
    status: PaymentStatus
    paid_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class RazorpayOrderCreate(BaseModel):
    subscription_id: int
    amount: float


class RazorpayOrderRead(BaseModel):
    key_id: str
    order_id: str
    amount: int
    currency: str = "INR"
    name: str = "Bite a Fruit"
    description: str = "Fruit bowl subscription"
    customer_name: str
    customer_email: EmailStr
    customer_contact: str | None = None
    demo_mode: bool = False


class RazorpayPaymentVerify(BaseModel):
    subscription_id: int
    amount: float
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class InventoryAvailabilityUpdate(BaseModel):
    availability_status: str
