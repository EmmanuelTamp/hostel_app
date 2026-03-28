import hashlib
import hmac
import logging
from decimal import Decimal
from urllib.parse import urlencode

from django.conf import settings
from django.db import transaction
from django.http import HttpResponseRedirect
from django.utils import timezone

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminUserRole
from auditlogs.models import AuditLog
from bookings.access_code import generate_code, hash_code
from bookings.models import AccessCode, Booking, Reservation
from bookings.notifications import send_access_code_email
from hostels.models import RoomType

from .models import Payment, Payout, RefundRequest
from .notifications import send_payment_receipt_email
from .paystack import initialize_transaction, verify_transaction
from .serializers import (
    AdminPaymentSerializer,
    AdminPayoutUpdateSerializer,
    AdminRefundRequestUpdateSerializer,
    InitiatePaymentSerializer,
    PaymentSerializer,
    PayoutSerializer,
    RefundRequestSerializer,
)


logger = logging.getLogger(__name__)

PLATFORM_FEE = Decimal("30.00")


def get_client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def write_audit_log(
    *,
    actor,
    action,
    target_model,
    target_id,
    before_data=None,
    after_data=None,
    description="",
    request=None,
):
    AuditLog.objects.create(
        actor=actor,
        action=action,
        target_model=target_model,
        target_id=str(target_id),
        before_data=before_data or {},
        after_data=after_data or {},
        description=description,
        ip_address=get_client_ip(request) if request else None,
    )


def finalize_successful_payment(reference, verification_data=None, raw_payload=None):
    """
    Shared finalization logic for both:
    - Paystack webhook
    - Manual verify endpoint

    Returns a tuple: (success: bool, response_dict: dict, http_status: int)
    """
    if not reference:
        return False, {"detail": "Missing reference."}, 400

    try:
        payment = Payment.objects.select_related(
            "reservation",
            "reservation__room_type",
            "reservation__student",
            "booking",
        ).get(reference=reference)
    except Payment.DoesNotExist:
        return False, {"detail": "Payment record not found."}, 404

    reservation = payment.reservation
    if not reservation:
        return False, {"detail": "Reservation record not found for payment."}, 404

    if payment.status == Payment.Status.SUCCESS and payment.booking:
        return True, {
            "detail": "Already processed.",
            "booking_id": payment.booking.id,
        }, 200

    if not verification_data:
        return False, {"detail": "Missing verification data."}, 400

    if verification_data.get("status") != "success":
        return False, {"detail": "Payment not successful."}, 200

    amount_kobo = int(verification_data.get("amount", 0))
    expected_kobo = int(Decimal(payment.total_paid or payment.amount) * 100)

    if amount_kobo != expected_kobo:
        payment.status = Payment.Status.FAILED
        payment.raw_payload = raw_payload or verification_data
        payment.save(update_fields=["status", "raw_payload"])
        return False, {"detail": "Amount mismatch."}, 400

    room_type = reservation.room_type

    with transaction.atomic():
        locked_payment = Payment.objects.select_for_update().get(id=payment.id)
        locked_reservation = Reservation.objects.select_for_update().select_related(
            "room_type",
            "student",
        ).get(id=reservation.id)
        locked_room = RoomType.objects.select_for_update().get(id=room_type.id)

        if locked_payment.status == Payment.Status.SUCCESS and locked_payment.booking:
            return True, {
                "detail": "Already processed.",
                "booking_id": locked_payment.booking.id,
            }, 200

        if locked_reservation.status != Reservation.Status.HELD:
            if locked_payment.booking:
                return True, {
                    "detail": "Already processed.",
                    "booking_id": locked_payment.booking.id,
                }, 200

            return False, {"detail": "Reservation is no longer active."}, 200

        if locked_reservation.is_expired:
            locked_reservation.status = Reservation.Status.EXPIRED
            locked_reservation.save(update_fields=["status"])

            if locked_room.held > 0:
                locked_room.held -= 1
                locked_room.save(update_fields=["held"])

            locked_payment.status = Payment.Status.FAILED
            locked_payment.raw_payload = raw_payload or verification_data
            locked_payment.save(update_fields=["status", "raw_payload"])

            return False, {"detail": "Reservation expired."}, 200

        if locked_room.held <= 0:
            locked_payment.status = Payment.Status.FAILED
            locked_payment.raw_payload = raw_payload or verification_data
            locked_payment.save(update_fields=["status", "raw_payload"])
            return False, {"detail": "No held slot available."}, 200

        locked_room.held -= 1
        locked_room.booked += 1
        locked_room.save(update_fields=["held", "booked"])

        booking = Booking.objects.create(
            student=locked_reservation.student,
            room_type=locked_reservation.room_type,
            amount=locked_reservation.amount,
            status=Booking.Status.CONFIRMED,
            host_confirmation_status=Booking.HostConfirmationStatus.PENDING,
            refund_status=Booking.RefundStatus.NOT_REQUESTED,
            payout_status=Booking.PayoutStatus.NOT_ELIGIBLE,
            commission_status=Booking.CommissionStatus.PENDING,
        )

        locked_reservation.status = Reservation.Status.PAID
        locked_reservation.save(update_fields=["status"])

        locked_payment.booking = booking
        locked_payment.status = Payment.Status.SUCCESS
        locked_payment.room_amount = locked_reservation.amount
        locked_payment.platform_fee = PLATFORM_FEE
        locked_payment.total_paid = locked_reservation.amount + PLATFORM_FEE
        locked_payment.host_payout_amount = locked_reservation.amount
        locked_payment.platform_revenue_amount = PLATFORM_FEE
        locked_payment.split_status = Payment.SplitStatus.SPLIT_READY
        locked_payment.raw_payload = raw_payload or verification_data
        locked_payment.paid_at = timezone.now()
        locked_payment.save(
            update_fields=[
                "booking",
                "status",
                "room_amount",
                "platform_fee",
                "total_paid",
                "host_payout_amount",
                "platform_revenue_amount",
                "split_status",
                "raw_payload",
                "paid_at",
            ]
        )

        if booking.room_type.hostel.caretaker_id:
            Payout.objects.get_or_create(
                booking=booking,
                defaults={
                    "payment": locked_payment,
                    "caretaker_id": booking.room_type.hostel.caretaker_id,
                    "amount": locked_payment.host_payout_amount,
                    "status": Payout.Status.PENDING,
                },
            )

        raw_code = generate_code(10)
        AccessCode.objects.create(
            booking=booking,
            code_hash=hash_code(raw_code),
            status=AccessCode.Status.ACTIVE,
        )

    send_access_code_email(booking.student, booking, raw_code)

    try:
        send_payment_receipt_email(
            student=booking.student,
            booking=booking,
            payment=locked_payment,
        )
    except Exception:
        logger.exception(
            "Payment succeeded but receipt email failed for payment reference %s",
            locked_payment.reference,
        )

    return True, {
        "detail": "Processed.",
        "booking_id": booking.id,
    }, 200


class InitiatePaystackPaymentAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role != "STUDENT":
            return Response({"detail": "Only students can pay."}, status=403)

        serializer = InitiatePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reservation_id = serializer.validated_data["reservation_id"]
        callback_url = serializer.validated_data.get("callback_url") or getattr(
            settings,
            "PAYSTACK_CALLBACK_URL",
            "",
        )

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

        payment = Payment.objects.filter(reservation=reservation).first()

        if payment and payment.status == Payment.Status.SUCCESS and payment.booking:
            return Response(
                {
                    "detail": "This reservation has already been paid for.",
                    "booking_id": payment.booking.id,
                },
                status=400,
            )

        if payment:
            reference = payment.reference
        else:
            reference = f"RSV_{reservation.id}_{int(timezone.now().timestamp())}"

        room_amount = Decimal(reservation.amount)
        total_amount = room_amount + PLATFORM_FEE
        amount_kobo = int(total_amount * 100)

        payment, created = Payment.objects.get_or_create(
            reservation=reservation,
            defaults={
                "provider": "PAYSTACK",
                "reference": reference,
                "amount": total_amount,
                "room_amount": room_amount,
                "platform_fee": PLATFORM_FEE,
                "total_paid": total_amount,
                "host_payout_amount": room_amount,
                "platform_revenue_amount": PLATFORM_FEE,
                "split_status": Payment.SplitStatus.PENDING,
                "status": Payment.Status.INITIATED,
            },
        )

        changed_fields = []

        if payment.amount != total_amount:
            payment.amount = total_amount
            changed_fields.append("amount")
        if payment.room_amount != room_amount:
            payment.room_amount = room_amount
            changed_fields.append("room_amount")
        if payment.platform_fee != PLATFORM_FEE:
            payment.platform_fee = PLATFORM_FEE
            changed_fields.append("platform_fee")
        if payment.total_paid != total_amount:
            payment.total_paid = total_amount
            changed_fields.append("total_paid")
        if payment.host_payout_amount != room_amount:
            payment.host_payout_amount = room_amount
            changed_fields.append("host_payout_amount")
        if payment.platform_revenue_amount != PLATFORM_FEE:
            payment.platform_revenue_amount = PLATFORM_FEE
            changed_fields.append("platform_revenue_amount")
        if payment.status != Payment.Status.INITIATED:
            payment.status = Payment.Status.INITIATED
            changed_fields.append("status")

        if changed_fields:
            payment.save(update_fields=changed_fields)

        reference = payment.reference

        if not settings.PAYSTACK_SECRET_KEY:
            return Response({"detail": "Missing PAYSTACK_SECRET_KEY in environment."}, status=500)

        if not callback_url:
            return Response(
                {"detail": "Missing callback URL. Set PAYSTACK_CALLBACK_URL or send callback_url."},
                status=500,
            )

        data = initialize_transaction(
            secret_key=settings.PAYSTACK_SECRET_KEY,
            email=request.user.email,
            amount_kobo=amount_kobo,
            reference=reference,
            callback_url=callback_url,
        )

        return Response(
            {
                "reference": reference,
                "room_amount": str(room_amount),
                "platform_fee": str(PLATFORM_FEE),
                "total_amount": str(total_amount),
                "authorization_url": data["data"]["authorization_url"],
                "access_code": data["data"]["access_code"],
                "callback_url": callback_url,
            },
            status=200,
        )


class PaystackCallbackRedirectAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        base_frontend_url = getattr(
            settings,
            "FRONTEND_PAYMENT_SUCCESS_URL",
            "http://127.0.0.1:5173/payment/success",
        )
        query_string = urlencode(request.GET, doseq=True)
        redirect_url = f"{base_frontend_url}?{query_string}" if query_string else base_frontend_url
        return HttpResponseRedirect(redirect_url)


class ManualVerifyPaystackPaymentAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role != "STUDENT":
            return Response({"detail": "Only students can verify payments."}, status=403)

        reference = request.data.get("reference") or request.query_params.get("reference")
        if not reference:
            return Response({"detail": "Reference is required."}, status=400)

        if not settings.PAYSTACK_SECRET_KEY:
            return Response({"detail": "Missing PAYSTACK_SECRET_KEY in environment."}, status=500)

        try:
            payment = Payment.objects.select_related("reservation").get(
                reference=reference,
                reservation__student=request.user,
            )
        except Payment.DoesNotExist:
            return Response({"detail": "Payment not found for this student."}, status=404)

        if payment.status == Payment.Status.SUCCESS and payment.booking:
            return Response(
                {
                    "detail": "Already processed.",
                    "booking_id": payment.booking.id,
                },
                status=200,
            )

        verify = verify_transaction(settings.PAYSTACK_SECRET_KEY, reference)
        if not verify.get("status"):
            return Response({"detail": "Verification failed."}, status=400)

        verification_data = verify.get("data", {})
        success, payload, http_status = finalize_successful_payment(
            reference=reference,
            verification_data=verification_data,
            raw_payload=verify,
        )

        if success:
            try:
                payment = Payment.objects.select_related("booking").get(reference=reference)
                if payment.booking_id:
                    write_audit_log(
                        actor=request.user,
                        action="PAYMENT_VERIFIED",
                        target_model="Payment",
                        target_id=payment.id,
                        before_data={},
                        after_data={
                            "status": payment.status,
                            "booking_id": payment.booking_id,
                            "split_status": payment.split_status,
                        },
                        description=f"Student manually verified successful payment {payment.reference}.",
                        request=request,
                    )
            except Payment.DoesNotExist:
                pass

        return Response(payload, status=http_status)


class PaystackWebhookAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        secret = getattr(settings, "PAYSTACK_SECRET_KEY", "")
        signature = request.headers.get("x-paystack-signature")

        if not secret or not signature:
            return Response({"detail": "Missing signature or secret."}, status=400)

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

        if event not in ("charge.success",):
            return Response({"detail": "Event ignored."}, status=200)

        verify = verify_transaction(settings.PAYSTACK_SECRET_KEY, reference)
        if not verify.get("status"):
            return Response({"detail": "Verification failed."}, status=400)

        verification_data = verify.get("data", {})
        success, response_payload, http_status = finalize_successful_payment(
            reference=reference,
            verification_data=verification_data,
            raw_payload=request.data,
        )

        if success:
            try:
                payment = Payment.objects.select_related("booking").get(reference=reference)
                if payment.booking_id:
                    write_audit_log(
                        actor=None,
                        action="PAYMENT_WEBHOOK_CONFIRMED",
                        target_model="Payment",
                        target_id=payment.id,
                        before_data={},
                        after_data={
                            "status": payment.status,
                            "booking_id": payment.booking_id,
                            "split_status": payment.split_status,
                        },
                        description=f"Webhook confirmed successful payment {payment.reference}.",
                        request=request,
                    )
            except Payment.DoesNotExist:
                pass

        return Response(response_payload, status=http_status)


class StudentRefundRequestListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = RefundRequestSerializer

    def get_queryset(self):
        if self.request.user.role != "STUDENT":
            return RefundRequest.objects.none()

        return RefundRequest.objects.select_related(
            "booking",
            "payment",
            "requested_by",
        ).filter(requested_by=self.request.user).order_by("-requested_at")

    def perform_create(self, serializer):
        user = self.request.user
        if user.role != "STUDENT":
            raise permissions.PermissionDenied("Only students can create refund requests.")

        booking = serializer.validated_data["booking"]
        payment = serializer.validated_data["payment"]

        if booking.student_id != user.id:
            raise permissions.PermissionDenied("You can only request refunds for your own bookings.")

        if payment.booking_id != booking.id:
            raise permissions.PermissionDenied("Payment does not belong to this booking.")

        if payment.status not in [Payment.Status.SUCCESS, Payment.Status.PARTIALLY_REFUNDED]:
            raise permissions.PermissionDenied("Refund can only be requested for a successful payment.")

        if booking.refund_status in [
            Booking.RefundStatus.REQUESTED,
            Booking.RefundStatus.APPROVED,
            Booking.RefundStatus.PROCESSED,
        ]:
            raise permissions.PermissionDenied("A refund workflow already exists for this booking.")

        refund_request = serializer.save(requested_by=user)

        before_booking = {
            "refund_status": booking.refund_status,
            "refund_requested_at": booking.refund_requested_at.isoformat() if booking.refund_requested_at else None,
        }

        booking.refund_status = Booking.RefundStatus.REQUESTED
        booking.refund_requested_at = timezone.now()
        booking.save(update_fields=["refund_status", "refund_requested_at"])

        write_audit_log(
            actor=user,
            action="REFUND_REQUEST_CREATED",
            target_model="RefundRequest",
            target_id=refund_request.id,
            before_data={},
            after_data={
                "booking_id": booking.id,
                "payment_id": payment.id,
                "requested_amount": str(refund_request.requested_amount),
                "status": refund_request.status,
            },
            description=f"Student created refund request for booking #{booking.id}.",
            request=self.request,
        )

        write_audit_log(
            actor=user,
            action="BOOKING_REFUND_STATUS_UPDATED",
            target_model="Booking",
            target_id=booking.id,
            before_data=before_booking,
            after_data={
                "refund_status": booking.refund_status,
                "refund_requested_at": booking.refund_requested_at.isoformat() if booking.refund_requested_at else None,
            },
            description=f"Booking #{booking.id} refund status moved to REQUESTED.",
            request=self.request,
        )

        return refund_request


class StudentPaymentListAPIView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PaymentSerializer

    def get_queryset(self):
        if self.request.user.role != "STUDENT":
            return Payment.objects.none()

        return Payment.objects.select_related(
            "reservation",
            "booking",
        ).filter(
            booking__student=self.request.user,
        ).order_by("-created_at")


class CaretakerPayoutListAPIView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PayoutSerializer

    def get_queryset(self):
        if self.request.user.role != "CARETAKER":
            return Payout.objects.none()

        return Payout.objects.select_related(
            "booking",
            "payment",
            "caretaker",
            "booking__room_type",
            "booking__room_type__hostel",
        ).filter(caretaker=self.request.user).order_by("-created_at")


class AdminRefundRequestListAPIView(generics.ListAPIView):
    permission_classes = [IsAdminUserRole]
    serializer_class = RefundRequestSerializer

    def get_queryset(self):
        queryset = RefundRequest.objects.select_related(
            "booking",
            "booking__student",
            "booking__room_type",
            "booking__room_type__hostel",
            "payment",
            "requested_by",
        ).order_by("-requested_at")

        status_param = self.request.query_params.get("status")
        booking_id = self.request.query_params.get("booking")
        hostel_id = self.request.query_params.get("hostel")

        if status_param:
            queryset = queryset.filter(status=status_param)

        if booking_id:
            queryset = queryset.filter(booking_id=booking_id)

        if hostel_id:
            queryset = queryset.filter(booking__room_type__hostel_id=hostel_id)

        return queryset


class AdminRefundRequestDetailAPIView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAdminUserRole]

    def get_queryset(self):
        return RefundRequest.objects.select_related(
            "booking",
            "booking__student",
            "booking__room_type",
            "booking__room_type__hostel",
            "payment",
            "requested_by",
        )

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return AdminRefundRequestUpdateSerializer
        return RefundRequestSerializer

    def perform_update(self, serializer):
        with transaction.atomic():
            refund_request = self.get_object()
            refund_request = RefundRequest.objects.select_for_update().select_related(
                "booking",
                "payment",
            ).get(id=refund_request.id)

            before_refund = {
                "status": refund_request.status,
                "approved_amount": str(refund_request.approved_amount),
                "admin_notes": refund_request.admin_notes,
                "resolved_at": refund_request.resolved_at.isoformat() if refund_request.resolved_at else None,
            }

            booking = refund_request.booking
            payment = refund_request.payment

            before_booking = {
                "refund_status": booking.refund_status,
                "refund_amount": str(booking.refund_amount),
                "refund_processed_at": booking.refund_processed_at.isoformat() if booking.refund_processed_at else None,
                "payout_status": booking.payout_status,
                "commission_status": booking.commission_status,
            }

            before_payment = {
                "status": payment.status,
                "refunded_amount": str(payment.refunded_amount),
                "split_status": payment.split_status,
            }

            serializer.instance = refund_request
            refund_request = serializer.save()

            if (
                refund_request.status == RefundRequest.Status.PROCESSED
                and booking.payout_status == Booking.PayoutStatus.RELEASED
            ):
                raise permissions.PermissionDenied(
                    "Refund cannot be processed after payout has already been released."
                )

            if refund_request.status == RefundRequest.Status.APPROVED:
                booking.refund_status = Booking.RefundStatus.APPROVED
                booking.refund_amount = refund_request.approved_amount
                booking.refund_processed_at = None
                booking.commission_status = Booking.CommissionStatus.PENDING

            elif refund_request.status == RefundRequest.Status.REJECTED:
                booking.refund_status = Booking.RefundStatus.REJECTED
                booking.refund_amount = Decimal("0.00")
                booking.refund_processed_at = None
                booking.commission_status = Booking.CommissionStatus.PENDING

            elif refund_request.status == RefundRequest.Status.PROCESSED:
                booking.refund_status = Booking.RefundStatus.PROCESSED
                booking.refund_amount = refund_request.approved_amount
                booking.refund_processed_at = refund_request.resolved_at
                booking.commission_status = Booking.CommissionStatus.RETAINED

                payment.refunded_amount = refund_request.approved_amount
                if refund_request.approved_amount > 0:
                    if refund_request.approved_amount < payment.room_amount:
                        payment.status = Payment.Status.PARTIALLY_REFUNDED
                    else:
                        payment.status = Payment.Status.REFUNDED

                if refund_request.approved_amount > 0:
                    payment.host_payout_amount = max(
                        Decimal("0.00"),
                        payment.room_amount - refund_request.approved_amount,
                    )

                if refund_request.approved_amount >= payment.room_amount:
                    booking.payout_status = Booking.PayoutStatus.NOT_ELIGIBLE
                    payment.split_status = Payment.SplitStatus.PENDING

                payment.save(
                    update_fields=[
                        "refunded_amount",
                        "status",
                        "host_payout_amount",
                        "split_status",
                    ]
                )

                payout = getattr(booking, "payout", None)
                if payout:
                    payout.amount = payment.host_payout_amount
                    if refund_request.approved_amount >= payment.room_amount:
                        payout.status = Payout.Status.FAILED
                        payout.notes = (
                            (payout.notes or "") + "\nPayout blocked because full refund was processed."
                        ).strip()
                    payout.save(update_fields=["amount", "status", "notes"])

            booking.save(
                update_fields=[
                    "refund_status",
                    "refund_amount",
                    "refund_processed_at",
                    "payout_status",
                    "commission_status",
                ]
            )

            write_audit_log(
                actor=self.request.user,
                action="REFUND_REQUEST_UPDATED",
                target_model="RefundRequest",
                target_id=refund_request.id,
                before_data=before_refund,
                after_data={
                    "status": refund_request.status,
                    "approved_amount": str(refund_request.approved_amount),
                    "admin_notes": refund_request.admin_notes,
                    "resolved_at": refund_request.resolved_at.isoformat() if refund_request.resolved_at else None,
                },
                description=f"Admin updated refund request #{refund_request.id}.",
                request=self.request,
            )

            write_audit_log(
                actor=self.request.user,
                action="BOOKING_REFUND_WORKFLOW_UPDATED",
                target_model="Booking",
                target_id=booking.id,
                before_data=before_booking,
                after_data={
                    "refund_status": booking.refund_status,
                    "refund_amount": str(booking.refund_amount),
                    "refund_processed_at": booking.refund_processed_at.isoformat() if booking.refund_processed_at else None,
                    "payout_status": booking.payout_status,
                    "commission_status": booking.commission_status,
                },
                description=f"Admin updated refund workflow on booking #{booking.id}.",
                request=self.request,
            )

            write_audit_log(
                actor=self.request.user,
                action="PAYMENT_REFUND_FIELDS_UPDATED",
                target_model="Payment",
                target_id=payment.id,
                before_data=before_payment,
                after_data={
                    "status": payment.status,
                    "refunded_amount": str(payment.refunded_amount),
                    "split_status": payment.split_status,
                },
                description=f"Admin updated refund-related payment fields for payment #{payment.id}.",
                request=self.request,
            )


class AdminPayoutListAPIView(generics.ListAPIView):
    permission_classes = [IsAdminUserRole]
    serializer_class = PayoutSerializer

    def get_queryset(self):
        queryset = Payout.objects.select_related(
            "booking",
            "booking__student",
            "booking__room_type",
            "booking__room_type__hostel",
            "payment",
            "caretaker",
        ).order_by("-created_at")

        status_param = self.request.query_params.get("status")
        caretaker_id = self.request.query_params.get("caretaker")
        hostel_id = self.request.query_params.get("hostel")

        if status_param:
            queryset = queryset.filter(status=status_param)

        if caretaker_id:
            queryset = queryset.filter(caretaker_id=caretaker_id)

        if hostel_id:
            queryset = queryset.filter(booking__room_type__hostel_id=hostel_id)

        return queryset


class AdminPayoutDetailAPIView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAdminUserRole]

    def get_queryset(self):
        return Payout.objects.select_related(
            "booking",
            "booking__student",
            "booking__room_type",
            "booking__room_type__hostel",
            "payment",
            "caretaker",
        )

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return AdminPayoutUpdateSerializer
        return PayoutSerializer

    def perform_update(self, serializer):
        with transaction.atomic():
            payout = self.get_object()
            payout = Payout.objects.select_for_update().select_related(
                "booking",
                "payment",
            ).get(id=payout.id)

            booking = payout.booking
            payment = payout.payment

            before_payout = {
                "status": payout.status,
                "eligible_at": payout.eligible_at.isoformat() if payout.eligible_at else None,
                "released_at": payout.released_at.isoformat() if payout.released_at else None,
                "reference": payout.reference,
                "notes": payout.notes,
            }
            before_booking = {
                "payout_status": booking.payout_status,
                "payout_eligible_at": booking.payout_eligible_at.isoformat() if booking.payout_eligible_at else None,
                "payout_released_at": booking.payout_released_at.isoformat() if booking.payout_released_at else None,
                "commission_status": booking.commission_status,
            }
            before_payment = {
                "split_status": payment.split_status,
            }

            serializer.instance = payout
            payout = serializer.save()

            if booking.host_confirmation_status != Booking.HostConfirmationStatus.CONFIRMED:
                raise permissions.PermissionDenied("Payout cannot progress before host confirmation.")

            if booking.refund_status == Booking.RefundStatus.PROCESSED and payment.host_payout_amount <= 0:
                raise permissions.PermissionDenied("Payout cannot proceed on a fully refunded booking.")

            if (
                booking.commission_status == Booking.CommissionStatus.SEPARATED
                and payout.status == Payout.Status.RELEASED
            ):
                raise permissions.PermissionDenied(
                    "This booking commission has already been separated."
                )

            if payout.status == Payout.Status.ELIGIBLE:
                booking.payout_status = Booking.PayoutStatus.ELIGIBLE
                booking.payout_eligible_at = payout.eligible_at

            elif payout.status == Payout.Status.PROCESSING:
                booking.payout_status = Booking.PayoutStatus.PROCESSING
                booking.payout_eligible_at = payout.eligible_at

            elif payout.status == Payout.Status.RELEASED:
                booking.payout_status = Booking.PayoutStatus.RELEASED
                booking.payout_eligible_at = payout.eligible_at
                booking.payout_released_at = payout.released_at
                booking.commission_status = Booking.CommissionStatus.SEPARATED
                payment.split_status = Payment.SplitStatus.SPLIT_COMPLETED
                payment.save(update_fields=["split_status"])

            booking.save(
                update_fields=[
                    "payout_status",
                    "payout_eligible_at",
                    "payout_released_at",
                    "commission_status",
                ]
            )

            write_audit_log(
                actor=self.request.user,
                action="PAYOUT_UPDATED",
                target_model="Payout",
                target_id=payout.id,
                before_data=before_payout,
                after_data={
                    "status": payout.status,
                    "eligible_at": payout.eligible_at.isoformat() if payout.eligible_at else None,
                    "released_at": payout.released_at.isoformat() if payout.released_at else None,
                    "reference": payout.reference,
                    "notes": payout.notes,
                },
                description=f"Admin updated payout #{payout.id}.",
                request=self.request,
            )

            write_audit_log(
                actor=self.request.user,
                action="BOOKING_PAYOUT_WORKFLOW_UPDATED",
                target_model="Booking",
                target_id=booking.id,
                before_data=before_booking,
                after_data={
                    "payout_status": booking.payout_status,
                    "payout_eligible_at": booking.payout_eligible_at.isoformat() if booking.payout_eligible_at else None,
                    "payout_released_at": booking.payout_released_at.isoformat() if booking.payout_released_at else None,
                    "commission_status": booking.commission_status,
                },
                description=f"Admin updated payout workflow on booking #{booking.id}.",
                request=self.request,
            )

            if payment.split_status != before_payment["split_status"]:
                write_audit_log(
                    actor=self.request.user,
                    action="PAYMENT_SPLIT_STATUS_UPDATED",
                    target_model="Payment",
                    target_id=payment.id,
                    before_data=before_payment,
                    after_data={"split_status": payment.split_status},
                    description=f"Admin updated split status for payment #{payment.id}.",
                    request=self.request,
                )


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
            "booking__room_type__hostel__location",
        ).order_by("-created_at")

        status_param = self.request.query_params.get("status")
        provider = self.request.query_params.get("provider")
        reference = self.request.query_params.get("reference")
        booking_id = self.request.query_params.get("booking")
        reservation_id = self.request.query_params.get("reservation")
        split_status = self.request.query_params.get("split_status")

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

        if split_status:
            queryset = queryset.filter(split_status=split_status)

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
            "booking__room_type__hostel__location",
        )