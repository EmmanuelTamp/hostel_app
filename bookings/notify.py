from django.core.mail import send_mail
from django.conf import settings


def send_access_code_email(to_email: str, student_name: str, hostel_name: str, room_type: str, code: str):
    subject = "Your Hostel Booking Code"
    message = (
        f"Hello {student_name},\n\n"
        f"Your booking is confirmed.\n\n"
        f"Hostel: {hostel_name}\n"
        f"Room type: {room_type}\n"
        f"Secret code: {code}\n\n"
        f"Present this code to the caretaker when you arrive.\n\n"
        f"Thank you."
    )
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [to_email], fail_silently=False)