from django.urls import path
from .views import (
    AdminPaymentDetailAPIView,
    AdminPaymentsAPIView,
    AdminPayoutDetailAPIView,
    AdminPayoutListAPIView,
    AdminRefundRequestDetailAPIView,
    AdminRefundRequestListAPIView,
    CaretakerPayoutListAPIView,
    InitiatePaystackPaymentAPIView,
    ManualVerifyPaystackPaymentAPIView,
    PaystackCallbackRedirectAPIView,
    PaystackWebhookAPIView,
    StudentPaymentListAPIView,
    StudentRefundRequestListCreateAPIView,
)

urlpatterns = [
    path("payments/paystack/init/", InitiatePaystackPaymentAPIView.as_view(), name="paystack-init"),
    path("payments/paystack/webhook/", PaystackWebhookAPIView.as_view(), name="paystack-webhook"),
    path("payments/paystack/verify/", ManualVerifyPaystackPaymentAPIView.as_view(), name="paystack-verify"),
    path("payments/paystack/callback/", PaystackCallbackRedirectAPIView.as_view(), name="paystack-callback"),

    # student
    path("students/payments/", StudentPaymentListAPIView.as_view(), name="student-payments"),
    path("students/refund-requests/", StudentRefundRequestListCreateAPIView.as_view(), name="student-refund-requests"),

    # caretaker
    path("caretaker/payouts/", CaretakerPayoutListAPIView.as_view(), name="caretaker-payouts"),

    # admin
    path("admin/payments/", AdminPaymentsAPIView.as_view(), name="admin-payments"),
    path("admin/payments/<int:pk>/", AdminPaymentDetailAPIView.as_view(), name="admin-payment-detail"),
    path("admin/refund-requests/", AdminRefundRequestListAPIView.as_view(), name="admin-refund-requests"),
    path("admin/refund-requests/<int:pk>/", AdminRefundRequestDetailAPIView.as_view(), name="admin-refund-request-detail"),
    path("admin/payouts/", AdminPayoutListAPIView.as_view(), name="admin-payouts"),
    path("admin/payouts/<int:pk>/", AdminPayoutDetailAPIView.as_view(), name="admin-payout-detail"),
]