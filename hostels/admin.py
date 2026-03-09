from django.contrib import admin
from .models import Hostel, RoomType


@admin.register(Hostel)
class HostelAdmin(admin.ModelAdmin):
    list_display = ("name", "location_area", "caretaker", "is_active", "created_at")
    list_filter = ("is_active", "location_area")
    search_fields = ("name", "location_area")


@admin.register(RoomType)
class RoomTypeAdmin(admin.ModelAdmin):
    list_display = ("hostel", "name", "price", "capacity", "booked", "is_active")
    list_filter = ("is_active", "hostel")
    search_fields = ("name", "hostel__name")

    def available_display(self, obj):
        return obj.available
    available_display.short_description = "Available"