from django.conf import settings
from django.db import models
from django.core.exceptions import ValidationError


class Hostel(models.Model):
    name = models.CharField(max_length=255)
    location_area = models.CharField(max_length=255)  # e.g., Madina, Legon, East Legon
    address = models.TextField(blank=True, null=True)

    # Optional GPS (useful later for maps)
    gps_lat = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    gps_lng = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)

    description = models.TextField(blank=True, null=True)
    amenities = models.TextField(blank=True, null=True)  # e.g., "Wi-Fi, Security, Water"
    rules = models.TextField(blank=True, null=True)

    # The caretaker/landlord account (admin will create this user)
    caretaker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="managed_hostels",
        limit_choices_to={"role": "CARETAKER"},
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class HostelImage(models.Model):
    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="hostels/")
    caption = models.CharField(max_length=255, blank=True, null=True)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["display_order", "id"]

    def __str__(self):
        return f"{self.hostel.name} - Image {self.id}"


class RoomType(models.Model):
    class BookingMode(models.TextChoices):
        BEDSPACE = "BEDSPACE", "Bedspace (1 slot)"
        WHOLE_ROOM = "WHOLE_ROOM", "Whole room only"

    hostel = models.ForeignKey(Hostel, on_delete=models.CASCADE, related_name="room_types")
    name = models.CharField(max_length=100)  # "1 in 1", "2 in 1", etc.

    booking_mode = models.CharField(
        max_length=20, choices=BookingMode.choices, default=BookingMode.BEDSPACE
    )

    capacity = models.PositiveIntegerField()  # total slots
    booked = models.PositiveIntegerField(default=0)
    held = models.PositiveIntegerField(default=0)

    price = models.DecimalField(max_digits=12, decimal_places=2)
    condition = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    @property
    def available(self) -> int:
        remaining = int(self.capacity) - int(self.booked) - int(self.held)
        return remaining if remaining > 0 else 0
    
    def clean(self):
        # Enforce: Whole room => capacity must be 1
        if self.booking_mode == self.BookingMode.WHOLE_ROOM and self.capacity != 1:
            raise ValidationError({"capacity": "Capacity must be 1 when booking mode is WHOLE_ROOM."})

        # Enforce: booked + held can't exceed capacity
        if self.booked + self.held > self.capacity:
            raise ValidationError({"held": "Booked plus held cannot be greater than capacity."})

    def save(self, *args, **kwargs):
        self.full_clean()  # ensures clean() runs on admin save too
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.hostel.name} - {self.name}"