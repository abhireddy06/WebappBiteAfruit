from enum import Enum


class UserRole(str, Enum):
    admin = "admin"
    customer = "customer"
    delivery_partner = "delivery_partner"


class SubscriptionStatus(str, Enum):
    active = "active"
    paused = "paused"
    completed = "completed"
    cancelled = "cancelled"


class DeliveryStatus(str, Enum):
    pending = "pending"
    out_for_delivery = "out_for_delivery"
    delivered = "delivered"
    skipped = "skipped"


class PaymentStatus(str, Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"
    refunded = "refunded"

