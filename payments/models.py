from django.db import models


class Payment(models.Model):
    class Status(models.TextChoices):
        INITIATED = "INITIATED", "Initiated"
        SUCCESS = "SUCCESS", "Success"
        FAILED = "FAILED", "Failed"

    reservation = models.OneToOneField(
        "bookings.Reservation",
        on_delete=models.CASCADE,
        related_name="payment",
        null=True,
        blank=True,
    )
    booking = models.OneToOneField(
        "bookings.Booking",
        on_delete=models.CASCADE,
        related_name="payment",
        null=True,
        blank=True,
    )
    provider = models.CharField(max_length=50, default="PAYSTACK")  # or FLUTTERWAVE
    reference = models.CharField(max_length=100, unique=True)

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.INITIATED)

    raw_payload = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"{self.provider} - {self.reference} - {self.status}"