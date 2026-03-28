from django.contrib import admin
from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "booking",
        "student",
        "hostel",
        "rating",
        "is_visible",
        "created_at",
        "updated_at",
    )
    list_filter = ("rating", "is_visible", "created_at", "updated_at")
    search_fields = (
        "booking__student__username",
        "booking__student__email",
        "hostel__name",
        "comment",
    )
    autocomplete_fields = ("booking", "student", "hostel")
    readonly_fields = ("created_at", "updated_at")