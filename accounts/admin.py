from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User

    # What shows on the Users list page
    list_display = ("username", "email", "role", "is_staff", "is_active")
    list_filter = ("role", "is_staff", "is_active")

    # Add "role" and "phone" to the user edit page
    fieldsets = UserAdmin.fieldsets + (
        ("Extra fields", {"fields": ("role", "phone")}),
    )

    # Add "role" and "phone" to the user creation page
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Extra fields", {"fields": ("role", "phone")}),
    )

    search_fields = ("username", "email", "phone")
    ordering = ("username",)