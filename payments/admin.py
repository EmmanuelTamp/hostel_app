from django.contrib import admin
from .models import Payment, Payout, RefundRequest


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "reference",
        "provider",
        "reservation",
        "booking",
        "amount",
        "room_amount",
        "platform_fee",
        "total_paid",
        "status",
        "split_status",
        "paid_at",
        "created_at",
    )
    list_filter = ("provider", "status", "split_status", "created_at", "paid_at")
    search_fields = (
        "reference",
        "reservation__student__username",
        "reservation__student__email",
        "booking__student__username",
        "booking__student__email",
        "booking__room_type__hostel__name",
    )
    autocomplete_fields = ("reservation", "booking")
    readonly_fields = ("created_at", "paid_at")


@admin.register(RefundRequest)
class RefundRequestAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "booking",
        "payment",
        "requested_by",
        "requested_amount",
        "approved_amount",
        "status",
        "requested_at",
        "resolved_at",
    )
    list_filter = ("status", "requested_at", "resolved_at")
    search_fields = (
        "booking__student__username",
        "booking__student__email",
        "booking__room_type__hostel__name",
        "payment__reference",
        "requested_by__username",
        "requested_by__email",
        "reason",
        "admin_notes",
    )
    autocomplete_fields = ("booking", "payment", "requested_by")
    readonly_fields = ("requested_at", "resolved_at")


@admin.register(Payout)
class PayoutAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "booking",
        "payment",
        "caretaker",
        "amount",
        "status",
        "eligible_at",
        "released_at",
        "reference",
        "created_at",
    )
    list_filter = ("status", "eligible_at", "released_at", "created_at")
    search_fields = (
        "booking__student__username",
        "booking__student__email",
        "booking__room_type__hostel__name",
        "payment__reference",
        "caretaker__username",
        "caretaker__email",
        "reference",
        "notes",
    )
    autocomplete_fields = ("booking", "payment", "caretaker")
    readonly_fields = ("created_at",)