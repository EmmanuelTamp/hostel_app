from django.contrib import admin
from .models import Hostel, HostelImage, Location, RoomType


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "city",
        "region",
        "university_name",
        "campus_name",
        "is_active",
        "created_at",
    )
    list_filter = ("is_active", "city", "region", "university_name", "campus_name")
    search_fields = ("name", "city", "region", "university_name", "campus_name")
    ordering = ("name", "id")


class HostelImageInline(admin.TabularInline):
    model = HostelImage
    extra = 1
    fields = ("image", "caption", "display_order", "is_active", "created_at")
    readonly_fields = ("created_at",)


@admin.register(Hostel)
class HostelAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "location",
        "location_area",
        "caretaker",
        "is_active",
        "created_at",
    )
    list_filter = ("is_active", "location", "location_area")
    search_fields = (
        "name",
        "location_area",
        "address",
        "location__name",
        "location__city",
        "location__region",
        "caretaker__username",
        "caretaker__email",
    )
    autocomplete_fields = ("caretaker", "location")
    inlines = [HostelImageInline]


@admin.register(RoomType)
class RoomTypeAdmin(admin.ModelAdmin):
    list_display = (
        "hostel",
        "name",
        "booking_mode",
        "price",
        "capacity",
        "booked",
        "held",
        "available_display",
        "is_active",
    )
    list_filter = ("is_active", "booking_mode", "hostel")
    search_fields = ("name", "hostel__name")
    autocomplete_fields = ("hostel",)

    def available_display(self, obj):
        return obj.available

    available_display.short_description = "Available"


@admin.register(HostelImage)
class HostelImageAdmin(admin.ModelAdmin):
    list_display = ("hostel", "caption", "display_order", "is_active", "created_at")
    list_filter = ("is_active", "hostel")
    search_fields = ("hostel__name", "caption")
    autocomplete_fields = ("hostel",)