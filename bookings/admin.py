from django.contrib import admin
from .models import AccessCode, Booking, Dispute, Reservation, VerificationLog


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "student",
        "room_type",
        "amount",
        "status",
        "expires_at",
        "created_at",
    )
    list_filter = ("status", "created_at", "expires_at")
    search_fields = (
        "student__username",
        "student__email",
        "room_type__name",
        "room_type__hostel__name",
    )
    autocomplete_fields = ("student", "room_type")


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "student",
        "room_type",
        "amount",
        "status",
        "host_confirmation_status",
        "refund_status",
        "payout_status",
        "created_at",
    )
    list_filter = (
        "status",
        "host_confirmation_status",
        "refund_status",
        "payout_status",
        "created_at",
    )
    search_fields = (
        "student__username",
        "student__email",
        "room_type__name",
        "room_type__hostel__name",
        "cancellation_reason",
        "host_rejection_reason",
    )
    autocomplete_fields = ("student", "room_type")
    readonly_fields = (
        "created_at",
        "host_confirmed_at",
        "host_rejected_at",
        "refund_requested_at",
        "refund_processed_at",
        "payout_eligible_at",
        "payout_released_at",
        "cancelled_at",
    )


@admin.register(AccessCode)
class AccessCodeAdmin(admin.ModelAdmin):
    list_display = ("booking", "status", "created_at", "used_at")
    list_filter = ("status", "created_at", "used_at")
    search_fields = (
        "booking__student__username",
        "booking__student__email",
        "booking__room_type__name",
        "booking__room_type__hostel__name",
    )
    autocomplete_fields = ("booking",)


@admin.register(VerificationLog)
class VerificationLogAdmin(admin.ModelAdmin):
    list_display = ("booking", "caretaker", "action", "timestamp")
    list_filter = ("action", "timestamp")
    search_fields = (
        "booking__student__username",
        "booking__student__email",
        "booking__room_type__name",
        "booking__room_type__hostel__name",
        "caretaker__username",
        "caretaker__email",
    )
    autocomplete_fields = ("booking", "caretaker")


@admin.register(Dispute)
class DisputeAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "booking",
        "raised_by",
        "category",
        "status",
        "created_at",
        "resolved_at",
    )
    list_filter = ("category", "status", "created_at", "resolved_at")
    search_fields = (
        "booking__student__username",
        "booking__student__email",
        "booking__room_type__hostel__name",
        "raised_by__username",
        "raised_by__email",
        "description",
        "resolution_notes",
    )
    autocomplete_fields = ("booking", "raised_by")
    readonly_fields = ("created_at", "resolved_at")