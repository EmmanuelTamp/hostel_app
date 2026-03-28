from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "action",
        "target_model",
        "target_id",
        "actor",
        "ip_address",
        "timestamp",
    )
    list_filter = ("action", "target_model", "timestamp")
    search_fields = (
        "action",
        "target_model",
        "target_id",
        "actor__username",
        "actor__email",
        "description",
    )
    autocomplete_fields = ("actor",)
    readonly_fields = (
        "action",
        "target_model",
        "target_id",
        "actor",
        "before_data",
        "after_data",
        "description",
        "ip_address",
        "timestamp",
    )