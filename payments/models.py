from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class Payment(models.Model):
    class Status(models.TextChoices):
        INITIATED = "INITIATED", "Initiated"
        SUCCESS = "SUCCESS", "Success"
        FAILED = "FAILED", "Failed"
        REFUNDED = "REFUNDED", "Refunded"
        PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED", "Partially Refunded"

    class SplitStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SPLIT_READY = "SPLIT_READY", "Split Ready"
        SPLIT_COMPLETED = "SPLIT_COMPLETED", "Split Completed"

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

    provider = models.CharField(max_length=50, default="PAYSTACK")
    reference = models.CharField(max_length=100, unique=True)

    amount = models.DecimalField(max_digits=12, decimal_places=2)

    room_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    platform_fee = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("20.00"))
    total_paid = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    refunded_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    host_payout_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    platform_revenue_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    split_status = models.CharField(
        max_length=20,
        choices=SplitStatus.choices,
        default=SplitStatus.PENDING,
    )

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.INITIATED)
    raw_payload = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at", "id"]

    def clean(self):
        if self.amount < 0:
            raise ValidationError({"amount": "Amount cannot be negative."})
        if self.room_amount < 0:
            raise ValidationError({"room_amount": "Room amount cannot be negative."})
        if self.platform_fee < 0:
            raise ValidationError({"platform_fee": "Platform fee cannot be negative."})
        if self.total_paid < 0:
            raise ValidationError({"total_paid": "Total paid cannot be negative."})
        if self.refunded_amount < 0:
            raise ValidationError({"refunded_amount": "Refunded amount cannot be negative."})
        if self.host_payout_amount < 0:
            raise ValidationError({"host_payout_amount": "Host payout amount cannot be negative."})
        if self.platform_revenue_amount < 0:
            raise ValidationError({"platform_revenue_amount": "Platform revenue amount cannot be negative."})

        if self.total_paid != (self.room_amount + self.platform_fee):
            raise ValidationError(
                {"total_paid": "Total paid must equal room_amount plus platform_fee."}
            )

        if self.platform_revenue_amount != self.platform_fee:
            raise ValidationError(
                {"platform_revenue_amount": "Platform revenue amount must equal platform_fee."}
            )

        if self.refunded_amount > self.room_amount:
            raise ValidationError(
                {"refunded_amount": "Refunded amount cannot exceed room amount."}
            )

        if self.host_payout_amount > self.room_amount:
            raise ValidationError(
                {"host_payout_amount": "Host payout amount cannot exceed room amount."}
            )

        expected_host_payout = self.room_amount - self.refunded_amount
        if self.host_payout_amount != expected_host_payout:
            raise ValidationError(
                {"host_payout_amount": "Host payout amount must equal room_amount minus refunded_amount."}
            )

        if self.status == self.Status.SUCCESS and self.paid_at is None:
            raise ValidationError({"paid_at": "paid_at is required when payment is SUCCESS."})

        if self.status in [self.Status.INITIATED, self.Status.FAILED] and self.paid_at is not None:
            raise ValidationError({"paid_at": "paid_at should only be set for successful or refunded payments."})

        if self.status == self.Status.REFUNDED and self.refunded_amount != self.room_amount:
            raise ValidationError(
                {"refunded_amount": "Full refund status requires refunded_amount to equal room_amount."}
            )

        if self.status == self.Status.PARTIALLY_REFUNDED:
            if self.refunded_amount <= Decimal("0.00") or self.refunded_amount >= self.room_amount:
                raise ValidationError(
                    {"refunded_amount": "Partially refunded status requires refunded_amount to be greater than 0 and less than room_amount."}
                )

        if self.status == self.Status.SUCCESS and self.refunded_amount != Decimal("0.00"):
            raise ValidationError(
                {"refunded_amount": "Successful non-refunded payment must have refunded_amount 0.00."}
            )

        if self.status in [self.Status.SUCCESS, self.Status.PARTIALLY_REFUNDED, self.Status.REFUNDED]:
            if self.split_status == self.SplitStatus.PENDING:
                pass

    def save(self, *args, **kwargs):
        if self.total_paid == Decimal("0.00") and self.amount:
            self.total_paid = self.amount

        if self.room_amount == Decimal("0.00") and self.amount:
            if self.platform_fee <= self.amount:
                self.room_amount = self.amount - self.platform_fee

        self.total_paid = self.room_amount + self.platform_fee
        self.platform_revenue_amount = self.platform_fee
        self.host_payout_amount = self.room_amount - self.refunded_amount

        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.provider} - {self.reference} - {self.status}"


class RefundRequest(models.Model):
    class Status(models.TextChoices):
        REQUESTED = "REQUESTED", "Requested"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        PROCESSED = "PROCESSED", "Processed"

    booking = models.ForeignKey(
        "bookings.Booking",
        on_delete=models.CASCADE,
        related_name="refund_requests",
    )
    payment = models.ForeignKey(
        Payment,
        on_delete=models.CASCADE,
        related_name="refund_requests",
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="refund_requests",
    )

    reason = models.TextField()
    requested_amount = models.DecimalField(max_digits=12, decimal_places=2)
    approved_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.REQUESTED)
    admin_notes = models.TextField(blank=True, null=True)

    requested_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-requested_at", "id"]

    def clean(self):
        if self.requested_amount < 0:
            raise ValidationError({"requested_amount": "Requested amount cannot be negative."})

        if self.approved_amount < 0:
            raise ValidationError({"approved_amount": "Approved amount cannot be negative."})

        if self.payment_id and self.booking_id and self.payment.booking_id != self.booking_id:
            raise ValidationError({"payment": "Selected payment does not belong to the selected booking."})

        if self.payment_id and self.requested_amount > self.payment.room_amount:
            raise ValidationError(
                {"requested_amount": "Requested refund cannot exceed the room amount."}
            )

        if self.payment_id and self.approved_amount > self.payment.room_amount:
            raise ValidationError(
                {"approved_amount": "Approved refund cannot exceed the room amount."}
            )

        if self.status == self.Status.REQUESTED and self.approved_amount != Decimal("0.00"):
            raise ValidationError(
                {"approved_amount": "approved_amount must be 0.00 while refund is still REQUESTED."}
            )

        if self.status == self.Status.REJECTED and self.approved_amount != Decimal("0.00"):
            raise ValidationError(
                {"approved_amount": "approved_amount must be 0.00 when refund is REJECTED."}
            )

        if self.status in [self.Status.APPROVED, self.Status.PROCESSED]:
            if self.approved_amount <= Decimal("0.00"):
                raise ValidationError(
                    {"approved_amount": "approved_amount must be greater than 0.00 when refund is approved or processed."}
                )

        if self.status == self.Status.PROCESSED and self.resolved_at is None:
            raise ValidationError(
                {"resolved_at": "resolved_at is required when refund is PROCESSED."}
            )

        if self.status in [self.Status.APPROVED, self.Status.REJECTED] and self.resolved_at is None:
            raise ValidationError(
                {"resolved_at": "resolved_at is required once admin has resolved the refund request."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"RefundRequest #{self.id} - Booking #{self.booking_id} - {self.status}"


class Payout(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        ELIGIBLE = "ELIGIBLE", "Eligible"
        PROCESSING = "PROCESSING", "Processing"
        RELEASED = "RELEASED", "Released"
        FAILED = "FAILED", "Failed"

    booking = models.OneToOneField(
        "bookings.Booking",
        on_delete=models.CASCADE,
        related_name="payout",
    )
    payment = models.ForeignKey(
        Payment,
        on_delete=models.CASCADE,
        related_name="payouts",
    )
    caretaker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payouts",
        limit_choices_to={"role": "CARETAKER"},
    )

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    eligible_at = models.DateTimeField(blank=True, null=True)
    released_at = models.DateTimeField(blank=True, null=True)
    reference = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "id"]

    def clean(self):
        if self.amount < 0:
            raise ValidationError({"amount": "Payout amount cannot be negative."})

        if self.payment_id and self.booking_id and self.payment.booking_id != self.booking_id:
            raise ValidationError({"payment": "Selected payment does not belong to the selected booking."})

        if self.amount != self.payment.host_payout_amount:
            raise ValidationError({"amount": "Payout amount must match payment.host_payout_amount."})

        if self.status == self.Status.PENDING:
            if self.eligible_at is not None or self.released_at is not None:
                raise ValidationError(
                    {"eligible_at": "Pending payout should not have eligible_at or released_at timestamps."}
                )

        if self.status == self.Status.ELIGIBLE:
            if self.eligible_at is None:
                raise ValidationError({"eligible_at": "eligible_at is required when payout is ELIGIBLE."})
            if self.released_at is not None:
                raise ValidationError({"released_at": "released_at must be empty when payout is only ELIGIBLE."})

        if self.status == self.Status.PROCESSING:
            if self.eligible_at is None:
                raise ValidationError({"eligible_at": "eligible_at is required when payout is PROCESSING."})
            if self.released_at is not None:
                raise ValidationError({"released_at": "released_at must be empty when payout is PROCESSING."})

        if self.status == self.Status.RELEASED:
            if self.eligible_at is None:
                raise ValidationError({"eligible_at": "eligible_at is required when payout is RELEASED."})
            if self.released_at is None:
                raise ValidationError({"released_at": "released_at is required when payout is RELEASED."})

        if self.status == self.Status.FAILED and self.released_at is not None:
            raise ValidationError({"released_at": "Failed payout cannot have released_at."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"Payout #{self.id} - Booking #{self.booking_id} - {self.status}"