from django.urls import path
from .views import (
    InitiatePaystackPaymentAPIView,
    PaystackWebhookAPIView,
    AdminPaymentsAPIView,
    AdminPaymentDetailAPIView,
)

urlpatterns = [
    path("payments/paystack/init/", InitiatePaystackPaymentAPIView.as_view(), name="paystack-init"),
    path("payments/paystack/webhook/", PaystackWebhookAPIView.as_view(), name="paystack-webhook"),

    path("admin/payments/", AdminPaymentsAPIView.as_view(), name="admin-payments"),
    path("admin/payments/<int:pk>/", AdminPaymentDetailAPIView.as_view(), name="admin-payment-detail"),
]