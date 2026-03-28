from django.conf import settings
from django.core.mail import send_mail


def send_payment_receipt_email(student, booking, payment):
    subject = f"Payment Receipt - Booking #{booking.id}"

    student_name = student.get_full_name() or student.username
    hostel_name = booking.room_type.hostel.name
    room_type_name = booking.room_type.name

    message = f"""
Hello {student_name},

Your payment was successful.

Booking Details
---------------
Booking ID: {booking.id}
Hostel: {hostel_name}
Room Type: {room_type_name}

Payment Details
---------------
Reference: {payment.reference}
Room Amount: GHS {payment.room_amount}
Commission: GHS {payment.platform_fee}
Total Paid: GHS {payment.total_paid}
Payment Date: {payment.paid_at}

Your booking has been confirmed successfully.

Thank you.
""".strip()

    send_mail(
        subject=subject,
        message=message,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
        recipient_list=[student.email],
        fail_silently=False,
    )