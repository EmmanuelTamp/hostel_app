import hmac
import hashlib
from datetime import datetime
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from rest_framework import permissions, status, generics
from rest_framework.response import Response
from rest_framework.views import APIView

from bookings.models import Booking, AccessCode, Reservation
from bookings.access_code import generate_code, hash_code
from bookings.notifications import send_access_code_email
from hostels.models import RoomType
from accounts.permissions import IsAdminUserRole
from .models import Payment
from .serializers import InitiatePaymentSerializer, AdminPaymentSerializer
from .paystack import initialize_transaction, verify_transaction


class InitiatePaystackPaymentAPIView(APIView):
    """
    Student calls this after checkout to get Paystack authorization_url.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role != "STUDENT":
            return Response({"detail": "Only students can pay."}, status=403)

        serializer = InitiatePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reservation_id = serializer.validated_data["reservation_id"]

        try:
            reservation = Reservation.objects.select_related("room_type").get(
                id=reservation_id,
                student=request.user,
            )
        except Reservation.DoesNotExist:
            return Response({"detail": "Reservation not found."}, status=404)

        if reservation.status != Reservation.Status.HELD:
            return Response({"detail": "Reservation is not active."}, status=400)

        if reservation.is_expired:
            with transaction.atomic():
                locked_reservation = Reservation.objects.select_for_update().get(id=reservation.id)
                locked_room = RoomType.objects.select_for_update().get(id=locked_reservation.room_type_id)

                if locked_reservation.status == Reservation.Status.HELD and locked_reservation.is_expired:
                    locked_reservation.status = Reservation.Status.EXPIRED
                    locked_reservation.save(update_fields=["status"])

                    if locked_room.held > 0:
                        locked_room.held -= 1
                        locked_room.save(update_fields=["held"])

            return Response({"detail": "Reservation has expired. Please start again."}, status=400)

        # Make a unique reference
        reference = f"RSV_{reservation.id}_{int(timezone.now().timestamp())}"

        # Paystack amount is in kobo (GHS * 100)
        amount_kobo = int(Decimal(reservation.amount) * 100)

        # Create Payment record (INITIATED)
        payment, created = Payment.objects.get_or_create(
            reservation=reservation,
            defaults={
                "provider": "PAYSTACK",
                "reference": reference,
                "amount": reservation.amount,
                "status": Payment.Status.INITIATED,
            },
        )

        # If already created before, reuse reference
        reference = payment.reference

        if not settings.PAYSTACK_SECRET_KEY:
            return Response({"detail": "Missing PAYSTACK_SECRET_KEY in environment."}, status=500)

        data = initialize_transaction(
            secret_key=settings.PAYSTACK_SECRET_KEY,
            email=request.user.email,
            amount_kobo=amount_kobo,
            reference=reference,
            callback_url=getattr(settings, "PAYSTACK_CALLBACK_URL", ""),
        )

        # Return Paystack payment link
        return Response(
            {
                "reference": reference,
                "authorization_url": data["data"]["authorization_url"],
                "access_code": data["data"]["access_code"],
            },
            status=200,
        )


class PaystackWebhookAPIView(APIView):
    """
    Paystack calls this endpoint after payment events.
    IMPORTANT: Make this publicly accessible (no auth), but verify signature.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        secret = getattr(settings, "PAYSTACK_SECRET_KEY", "")
        signature = request.headers.get("x-paystack-signature")

        if not secret or not signature:
            return Response({"detail": "Missing signature or secret."}, status=400)

        # Verify signature
        computed = hmac.new(
            key=secret.encode("utf-8"),
            msg=request.body,
            digestmod=hashlib.sha512,
        ).hexdigest()

        if not hmac.compare_digest(computed, signature):
            return Response({"detail": "Invalid signature."}, status=401)

        payload = request.data
        event = payload.get("event")
        data = payload.get("data", {})

        reference = data.get("reference")
        if not reference:
            return Response({"detail": "Missing reference."}, status=400)

        # We only care about successful charge events
        if event not in ("charge.success",):
            return Response({"detail": "Event ignored."}, status=200)

        # Verify with Paystack API (server-to-server)
        verify = verify_transaction(settings.PAYSTACK_SECRET_KEY, reference)
        if not verify.get("status"):
            return Response({"detail": "Verification failed."}, status=400)

        vdata = verify.get("data", {})
        if vdata.get("status") != "success":
            return Response({"detail": "Payment not successful."}, status=200)

        amount_kobo = int(vdata.get("amount", 0))
        paid_at = vdata.get("paid_at")

        # Find payment record
        try:
            payment = Payment.objects.select_related("reservation", "reservation__room_type", "reservation__student").get(reference=reference)
        except Payment.DoesNotExist:
            return Response({"detail": "Payment record not found."}, status=404)

        reservation = payment.reservation
        if not reservation:
            return Response({"detail": "Reservation record not found for payment."}, status=404)

        # Idempotency: if already processed, return OK
        if payment.status == Payment.Status.SUCCESS and payment.booking and payment.booking.status == Booking.Status.CONFIRMED:
            return Response({"detail": "Already processed."}, status=200)

        room_type = reservation.room_type

        # Validate amount matches
        expected_kobo = int(Decimal(payment.amount) * 100)
        if amount_kobo != expected_kobo:
            payment.status = Payment.Status.FAILED
            payment.raw_payload = payload
            payment.save(update_fields=["status", "raw_payload"])
            return Response({"detail": "Amount mismatch."}, status=400)

        # Transaction-safe confirmation
        with transaction.atomic():
            locked_payment = Payment.objects.select_for_update().get(id=payment.id)
            locked_reservation = Reservation.objects.select_for_update().select_related("room_type", "student").get(id=reservation.id)
            locked_room = RoomType.objects.select_for_update().get(id=room_type.id)

            # Idempotency inside transaction
            if locked_payment.status == Payment.Status.SUCCESS and locked_payment.booking:
                return Response({"detail": "Already processed."}, status=200)

            if locked_reservation.status != Reservation.Status.HELD:
                return Response({"detail": "Reservation is no longer active."}, status=200)

            if locked_reservation.is_expired:
                locked_reservation.status = Reservation.Status.EXPIRED
                locked_reservation.save(update_fields=["status"])

                if locked_room.held > 0:
                    locked_room.held -= 1
                    locked_room.save(update_fields=["held"])

                locked_payment.status = Payment.Status.FAILED
                locked_payment.raw_payload = payload
                locked_payment.save(update_fields=["status", "raw_payload"])

                return Response({"detail": "Reservation expired."}, status=200)

            if locked_room.held <= 0:
                locked_payment.status = Payment.Status.FAILED
                locked_payment.raw_payload = payload
                locked_payment.save(update_fields=["status", "raw_payload"])
                return Response({"detail": "No held slot available."}, status=200)

            locked_room.held -= 1
            locked_room.booked += 1
            locked_room.save(update_fields=["held", "booked"])

            booking = Booking.objects.create(
                student=locked_reservation.student,
                room_type=locked_reservation.room_type,
                amount=locked_reservation.amount,
                status=Booking.Status.CONFIRMED,
            )

            locked_reservation.status = Reservation.Status.PAID
            locked_reservation.save(update_fields=["status"])

            locked_payment.booking = booking
            locked_payment.status = Payment.Status.SUCCESS
            locked_payment.raw_payload = payload
            locked_payment.paid_at = timezone.now()
            locked_payment.save(update_fields=["booking", "status", "raw_payload", "paid_at"])

            # Create access code (store only hash)
            raw_code = generate_code(10)
            AccessCode.objects.create(
                booking=booking,
                code_hash=hash_code(raw_code),
                status=AccessCode.Status.ACTIVE,
            )

        send_access_code_email(booking.student, booking, raw_code)

        return Response({"detail": "Processed."}, status=200)


class AdminPaymentsAPIView(generics.ListAPIView):
    permission_classes = [IsAdminUserRole]
    serializer_class = AdminPaymentSerializer

    def get_queryset(self):
        queryset = Payment.objects.select_related(
            "reservation",
            "reservation__student",
            "reservation__room_type",
            "reservation__room_type__hostel",
            "booking",
            "booking__student",
            "booking__room_type",
            "booking__room_type__hostel",
        ).order_by("-created_at")

        status_param = self.request.query_params.get("status")
        provider = self.request.query_params.get("provider")
        reference = self.request.query_params.get("reference")
        booking_id = self.request.query_params.get("booking")
        reservation_id = self.request.query_params.get("reservation")

        if status_param:
            queryset = queryset.filter(status=status_param)

        if provider:
            queryset = queryset.filter(provider__iexact=provider.strip())

        if reference:
            queryset = queryset.filter(reference__icontains=reference.strip())

        if booking_id:
            queryset = queryset.filter(booking_id=booking_id)

        if reservation_id:
            queryset = queryset.filter(reservation_id=reservation_id)

        return queryset


class AdminPaymentDetailAPIView(generics.RetrieveAPIView):
    permission_classes = [IsAdminUserRole]
    serializer_class = AdminPaymentSerializer

    def get_queryset(self):
        return Payment.objects.select_related(
            "reservation",
            "reservation__student",
            "reservation__room_type",
            "reservation__room_type__hostel",
            "booking",
            "booking__student",
            "booking__room_type",
            "booking__room_type__hostel",
        )