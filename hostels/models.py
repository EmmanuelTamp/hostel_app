from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class Location(models.Model):
    """
    A structured location model for MVP 2 scalability.
    This supports filtering hostels by town, campus, university, or area.
    """

    name = models.CharField(max_length=255)
    city = models.CharField(max_length=100, blank=True, null=True)
    region = models.CharField(max_length=100, blank=True, null=True)
    university_name = models.CharField(max_length=255, blank=True, null=True)
    campus_name = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["name", "city", "region"],
                name="unique_location_name_city_region",
            )
        ]

    def __str__(self):
        parts = [self.name]
        if self.city:
            parts.append(self.city)
        if self.region:
            parts.append(self.region)
        return " - ".join(parts)


class Hostel(models.Model):
    name = models.CharField(max_length=255)

    # legacy field kept temporarily for backward compatibility
    location_area = models.CharField(max_length=255, blank=True, null=True)

    location = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hostels",
    )

    address = models.TextField(blank=True, null=True)
    gps_lat = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    gps_lng = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)

    description = models.TextField(blank=True, null=True)
    amenities = models.TextField(blank=True, null=True)
    rules = models.TextField(blank=True, null=True)

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

    class Meta:
        ordering = ["-created_at", "id"]

    def clean(self):
        if (self.gps_lat is None) != (self.gps_lng is None):
            raise ValidationError("Both gps_lat and gps_lng must be provided together.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

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
    name = models.CharField(max_length=100)

    booking_mode = models.CharField(
        max_length=20,
        choices=BookingMode.choices,
        default=BookingMode.BEDSPACE,
    )

    capacity = models.PositiveIntegerField()
    booked = models.PositiveIntegerField(default=0)
    held = models.PositiveIntegerField(default=0)

    price = models.DecimalField(max_digits=12, decimal_places=2)
    condition = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["hostel", "name", "id"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(capacity__gte=1),
                name="roomtype_capacity_gte_1",
            ),
            models.CheckConstraint(
                condition=models.Q(booked__gte=0),
                name="roomtype_booked_gte_0",
            ),
            models.CheckConstraint(
                condition=models.Q(held__gte=0),
                name="roomtype_held_gte_0",
            ),
        ]

    @property
    def available(self) -> int:
        remaining = int(self.capacity) - int(self.booked) - int(self.held)
        return remaining if remaining > 0 else 0

    def clean(self):
        if self.booking_mode == self.BookingMode.WHOLE_ROOM and self.capacity != 1:
            raise ValidationError(
                {"capacity": "Capacity must be 1 when booking mode is WHOLE_ROOM."}
            )

        if self.booked + self.held > self.capacity:
            raise ValidationError(
                {"held": "Booked plus held cannot be greater than capacity."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.hostel.name} - {self.name}"