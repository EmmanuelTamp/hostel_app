from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


def reservation_expiry():
    return timezone.now() + timedelta(minutes=10)


class Reservation(models.Model):
    class Status(models.TextChoices):
        HELD = "HELD", "Held"
        EXPIRED = "EXPIRED", "Expired"
        PAID = "PAID", "Paid"
        CANCELLED = "CANCELLED", "Cancelled"

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reservations")
    room_type = models.ForeignKey("hostels.RoomType", on_delete=models.PROTECT, related_name="reservations")

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.HELD)
    expires_at = models.DateTimeField(default=reservation_expiry)

    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at

    def __str__(self):
        return f"Reservation #{self.id} - {self.student.username} - {self.room_type} - {self.status}"


class Booking(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CONFIRMED = "CONFIRMED", "Confirmed"
        CHECKED_IN = "CHECKED_IN", "Checked In"
        CANCELLED = "CANCELLED", "Cancelled"

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bookings")
    room_type = models.ForeignKey("hostels.RoomType", on_delete=models.PROTECT, related_name="bookings")

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Booking #{self.id} - {self.student.username} - {self.room_type}"
    
class AccessCode(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        USED = "USED", "Used"
        EXPIRED = "EXPIRED", "Expired"

    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name="access_code")
    code_hash = models.CharField(max_length=64, unique=True)  # sha256 hex length 64
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"AccessCode({self.booking_id}) - {self.status}"
    
class VerificationLog(models.Model):
    class Action(models.TextChoices):
        VERIFIED = "VERIFIED", "Verified"
        CHECKED_IN = "CHECKED_IN", "Checked In"

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="verification_logs")
    caretaker = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    action = models.CharField(max_length=20, choices=Action.choices)
    timestamp = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.booking_id} - {self.action} - {self.timestamp}"