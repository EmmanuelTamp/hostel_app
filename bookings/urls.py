from django.urls import path
from .views import (
    CheckoutAPIView,
    VerifyAccessCodeAPIView,
    CheckInAPIView,
    CaretakerBookingsAPIView,
    StudentBookingsAPIView,
    AdminBookingsAPIView,
    AdminBookingDetailAPIView,
)

urlpatterns = [
    path("bookings/checkout/", CheckoutAPIView.as_view(), name="booking-checkout"),

    # student
    path("students/my-bookings/", StudentBookingsAPIView.as_view(), name="student-my-bookings"),

    # caretaker
    path("caretaker/bookings/", CaretakerBookingsAPIView.as_view(), name="caretaker-bookings"),
    path("caretaker/verify-code/", VerifyAccessCodeAPIView.as_view(), name="caretaker-verify-code"),
    path("caretaker/check-in/", CheckInAPIView.as_view(), name="caretaker-check-in"),

    # admin
    path("admin/bookings/", AdminBookingsAPIView.as_view(), name="admin-bookings"),
    path("admin/bookings/<int:pk>/", AdminBookingDetailAPIView.as_view(), name="admin-booking-detail"),
]