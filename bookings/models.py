from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
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

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reservations",
    )
    room_type = models.ForeignKey(
        "hostels.RoomType",
        on_delete=models.PROTECT,
        related_name="reservations",
    )

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.HELD)
    expires_at = models.DateTimeField(default=reservation_expiry)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "id"]

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

    class HostConfirmationStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CONFIRMED = "CONFIRMED", "Confirmed"
        REJECTED = "REJECTED", "Rejected"

    class RefundStatus(models.TextChoices):
        NOT_REQUESTED = "NOT_REQUESTED", "Not Requested"
        REQUESTED = "REQUESTED", "Requested"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        PROCESSED = "PROCESSED", "Processed"

    class PayoutStatus(models.TextChoices):
        NOT_ELIGIBLE = "NOT_ELIGIBLE", "Not Eligible"
        ELIGIBLE = "ELIGIBLE", "Eligible"
        PROCESSING = "PROCESSING", "Processing"
        RELEASED = "RELEASED", "Released"

    class CommissionStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SEPARATED = "SEPARATED", "Separated"
        RETAINED = "RETAINED", "Retained"

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bookings",
    )
    room_type = models.ForeignKey(
        "hostels.RoomType",
        on_delete=models.PROTECT,
        related_name="bookings",
    )

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    host_confirmation_status = models.CharField(
        max_length=20,
        choices=HostConfirmationStatus.choices,
        default=HostConfirmationStatus.PENDING,
    )
    host_confirmed_at = models.DateTimeField(blank=True, null=True)
    host_rejected_at = models.DateTimeField(blank=True, null=True)
    host_rejection_reason = models.TextField(blank=True, null=True)

    cancelled_at = models.DateTimeField(blank=True, null=True)
    cancellation_reason = models.TextField(blank=True, null=True)

    refund_status = models.CharField(
        max_length=20,
        choices=RefundStatus.choices,
        default=RefundStatus.NOT_REQUESTED,
    )
    refund_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    refund_requested_at = models.DateTimeField(blank=True, null=True)
    refund_processed_at = models.DateTimeField(blank=True, null=True)

    payout_status = models.CharField(
        max_length=20,
        choices=PayoutStatus.choices,
        default=PayoutStatus.NOT_ELIGIBLE,
    )
    payout_eligible_at = models.DateTimeField(blank=True, null=True)
    payout_released_at = models.DateTimeField(blank=True, null=True)

    commission_status = models.CharField(
        max_length=20,
        choices=CommissionStatus.choices,
        default=CommissionStatus.PENDING,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "id"]

    def clean(self):
        if self.amount < 0:
            raise ValidationError({"amount": "Booking amount cannot be negative."})

        if self.refund_amount < 0:
            raise ValidationError({"refund_amount": "Refund amount cannot be negative."})

        if self.refund_amount > self.amount:
            raise ValidationError({"refund_amount": "Refund amount cannot exceed booking amount."})

        if self.status == self.Status.CANCELLED and not self.cancelled_at:
            raise ValidationError({"cancelled_at": "cancelled_at is required when booking is cancelled."})

        if self.status != self.Status.CANCELLED and self.cancelled_at:
            raise ValidationError({"cancelled_at": "cancelled_at should only be set when booking is cancelled."})

        if (
            self.host_confirmation_status == self.HostConfirmationStatus.REJECTED
            and not self.host_rejected_at
        ):
            raise ValidationError(
                {"host_rejected_at": "host_rejected_at is required when host confirmation is rejected."}
            )

        if (
            self.host_confirmation_status == self.HostConfirmationStatus.CONFIRMED
            and not self.host_confirmed_at
        ):
            raise ValidationError(
                {"host_confirmed_at": "host_confirmed_at is required when host confirmation is confirmed."}
            )

        if (
            self.host_confirmation_status != self.HostConfirmationStatus.REJECTED
            and self.host_rejected_at
        ):
            raise ValidationError(
                {"host_rejected_at": "host_rejected_at should only be set when host confirmation is rejected."}
            )

        if (
            self.host_confirmation_status != self.HostConfirmationStatus.CONFIRMED
            and self.host_confirmed_at
        ):
            raise ValidationError(
                {"host_confirmed_at": "host_confirmed_at should only be set when host confirmation is confirmed."}
            )

        if self.host_confirmation_status != self.HostConfirmationStatus.REJECTED and self.host_rejection_reason:
            raise ValidationError(
                {"host_rejection_reason": "host_rejection_reason should only be set when host confirmation is rejected."}
            )

        if self.host_confirmation_status == self.HostConfirmationStatus.REJECTED:
            if self.payout_status != self.PayoutStatus.NOT_ELIGIBLE:
                raise ValidationError(
                    {"payout_status": "Rejected host confirmation cannot have payout status other than NOT_ELIGIBLE."}
                )

        if self.payout_status == self.PayoutStatus.NOT_ELIGIBLE:
            if self.payout_eligible_at is not None:
                raise ValidationError(
                    {"payout_eligible_at": "payout_eligible_at must be empty when payout is NOT_ELIGIBLE."}
                )
            if self.payout_released_at is not None:
                raise ValidationError(
                    {"payout_released_at": "payout_released_at must be empty when payout is NOT_ELIGIBLE."}
                )

        if self.payout_status in [self.PayoutStatus.ELIGIBLE, self.PayoutStatus.PROCESSING]:
            if self.payout_eligible_at is None:
                raise ValidationError(
                    {"payout_eligible_at": "payout_eligible_at is required when payout is ELIGIBLE or PROCESSING."}
                )

        if self.payout_status == self.PayoutStatus.RELEASED:
            if self.payout_eligible_at is None:
                raise ValidationError(
                    {"payout_eligible_at": "payout_eligible_at is required when payout is RELEASED."}
                )
            if self.payout_released_at is None:
                raise ValidationError(
                    {"payout_released_at": "payout_released_at is required when payout is RELEASED."}
                )

        if self.refund_status == self.RefundStatus.NOT_REQUESTED:
            if self.refund_requested_at is not None:
                raise ValidationError(
                    {"refund_requested_at": "refund_requested_at must be empty when refund is NOT_REQUESTED."}
                )
            if self.refund_processed_at is not None:
                raise ValidationError(
                    {"refund_processed_at": "refund_processed_at must be empty when refund is NOT_REQUESTED."}
                )
            if self.refund_amount != Decimal("0.00"):
                raise ValidationError(
                    {"refund_amount": "refund_amount must be 0.00 when refund is NOT_REQUESTED."}
                )

        if self.refund_status == self.RefundStatus.REQUESTED and self.refund_requested_at is None:
            raise ValidationError(
                {"refund_requested_at": "refund_requested_at is required when refund is REQUESTED."}
            )

        if self.refund_status == self.RefundStatus.PROCESSED:
            if self.refund_processed_at is None:
                raise ValidationError(
                    {"refund_processed_at": "refund_processed_at is required when refund is PROCESSED."}
                )

        if self.refund_status in [self.RefundStatus.APPROVED, self.RefundStatus.REJECTED]:
            if self.refund_requested_at is None:
                raise ValidationError(
                    {"refund_requested_at": "refund_requested_at is required when refund has moved beyond request stage."}
                )

        if self.refund_status == self.RefundStatus.REJECTED and self.refund_amount != Decimal("0.00"):
            raise ValidationError(
                {"refund_amount": "refund_amount must remain 0.00 when refund is REJECTED."}
            )

        if self.refund_status == self.RefundStatus.PROCESSED and self.refund_amount <= Decimal("0.00"):
            raise ValidationError(
                {"refund_amount": "refund_amount must be greater than 0.00 when refund is PROCESSED."}
            )

        if self.commission_status == self.CommissionStatus.SEPARATED and self.status == self.Status.PENDING:
            raise ValidationError(
                {"commission_status": "Commission cannot be marked separated while booking is still pending."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"Booking #{self.id} - {self.student.username} - {self.room_type}"


class AccessCode(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        USED = "USED", "Used"
        EXPIRED = "EXPIRED", "Expired"

    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name="access_code")
    code_hash = models.CharField(max_length=64, unique=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at", "id"]

    def __str__(self):
        return f"AccessCode({self.booking_id}) - {self.status}"


class VerificationLog(models.Model):
    class Action(models.TextChoices):
        VERIFIED = "VERIFIED", "Verified"
        CHECKED_IN = "CHECKED_IN", "Checked In"

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="verification_logs")
    caretaker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    action = models.CharField(max_length=20, choices=Action.choices)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-timestamp", "id"]

    def __str__(self):
        return f"{self.booking_id} - {self.action} - {self.timestamp}"


class Dispute(models.Model):
    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        UNDER_REVIEW = "UNDER_REVIEW", "Under Review"
        RESOLVED = "RESOLVED", "Resolved"
        REJECTED = "REJECTED", "Rejected"

    class Category(models.TextChoices):
        PAYMENT = "PAYMENT", "Payment"
        ROOM_ISSUE = "ROOM_ISSUE", "Room Issue"
        HOST_CONDUCT = "HOST_CONDUCT", "Host Conduct"
        REFUND = "REFUND", "Refund"
        OTHER = "OTHER", "Other"

    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name="disputes",
    )
    raised_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="raised_disputes",
    )

    category = models.CharField(max_length=30, choices=Category.choices, default=Category.OTHER)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    resolution_notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at", "id"]

    def clean(self):
        if self.status in [self.Status.RESOLVED, self.Status.REJECTED] and not self.resolved_at:
            raise ValidationError(
                {"resolved_at": "resolved_at is required when dispute is resolved or rejected."}
            )

        if self.status in [self.Status.OPEN, self.Status.UNDER_REVIEW] and self.resolved_at:
            raise ValidationError(
                {"resolved_at": "resolved_at should only be set when dispute is resolved or rejected."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"Dispute #{self.id} - Booking #{self.booking_id} - {self.status}"