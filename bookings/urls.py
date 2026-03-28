from django.urls import path
from .views import (
    AdminBookingDetailAPIView,
    AdminBookingsAPIView,
    AdminDisputeDetailAPIView,
    AdminDisputeListAPIView,
    CaretakerBookingActionAPIView,
    CaretakerBookingsAPIView,
    CheckInAPIView,
    CheckoutAPIView,
    StudentBookingsAPIView,
    StudentDisputeCreateAPIView,
    VerifyAccessCodeAPIView,
)

urlpatterns = [
    path("bookings/checkout/", CheckoutAPIView.as_view(), name="booking-checkout"),

    # student
    path("students/my-bookings/", StudentBookingsAPIView.as_view(), name="student-my-bookings"),
    path("students/disputes/", StudentDisputeCreateAPIView.as_view(), name="student-disputes"),

    # caretaker
    path("caretaker/bookings/", CaretakerBookingsAPIView.as_view(), name="caretaker-bookings"),
    path("caretaker/bookings/<int:pk>/action/", CaretakerBookingActionAPIView.as_view(), name="caretaker-booking-action"),
    path("caretaker/verify-code/", VerifyAccessCodeAPIView.as_view(), name="caretaker-verify-code"),
    path("caretaker/check-in/", CheckInAPIView.as_view(), name="caretaker-check-in"),

    # admin
    path("admin/bookings/", AdminBookingsAPIView.as_view(), name="admin-bookings"),
    path("admin/bookings/<int:pk>/", AdminBookingDetailAPIView.as_view(), name="admin-booking-detail"),
    path("admin/disputes/", AdminDisputeListAPIView.as_view(), name="admin-disputes"),
    path("admin/disputes/<int:pk>/", AdminDisputeDetailAPIView.as_view(), name="admin-dispute-detail"),
]