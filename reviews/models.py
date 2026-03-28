from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class Review(models.Model):
    RATING_CHOICES = [(i, str(i)) for i in range(1, 6)]

    booking = models.OneToOneField(
        "bookings.Booking",
        on_delete=models.CASCADE,
        related_name="review",
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    hostel = models.ForeignKey(
        "hostels.Hostel",
        on_delete=models.CASCADE,
        related_name="reviews",
    )

    rating = models.PositiveSmallIntegerField(choices=RATING_CHOICES)
    comment = models.TextField(blank=True, null=True)

    is_visible = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "id"]

    def clean(self):
        if self.rating not in range(1, 6):
            raise ValidationError({"rating": "Rating must be between 1 and 5."})

        if self.booking_id:
            if self.booking.student_id != self.student_id:
                raise ValidationError(
                    {"student": "The review student must match the booking student."}
                )

            booking_hostel_id = self.booking.room_type.hostel_id
            if booking_hostel_id != self.hostel_id:
                raise ValidationError(
                    {"hostel": "The review hostel must match the hostel on the booking."}
                )

            if self.booking.status not in [
                self.booking.Status.CONFIRMED,
                self.booking.Status.CHECKED_IN,
            ]:
                raise ValidationError(
                    {"booking": "Only confirmed or checked-in bookings can be reviewed."}
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"Review #{self.id} - Booking #{self.booking_id} - {self.rating} star(s)"