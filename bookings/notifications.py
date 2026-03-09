from django.conf import settings
from django.core.mail import send_mail


def send_access_code_email(student, booking, raw_code):
    """
    Send the student's hostel access code by email.
    The raw code is sent only here and should not be stored in the database.
    """
    if not student.email:
        return False

    hostel_name = booking.room_type.hostel.name
    room_name = booking.room_type.name
    student_name = student.get_full_name() or student.username

    subject = "Your Hostel Booking Access Code"

    message = (
        f"Hello {student_name},\n\n"
        f"Your payment has been confirmed and your hostel booking is now active.\n\n"
        f"Hostel: {hostel_name}\n"
        f"Room Type: {room_name}\n"
        f"Booking ID: {booking.id}\n"
        f"Access Code: {raw_code}\n\n"
        f"Please keep this code safe. You will present it to the caretaker during check-in.\n\n"
        f"Regards,\n"
        f"Hostel App"
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
        recipient_list=[student.email],
        fail_silently=False,
    )

    return True