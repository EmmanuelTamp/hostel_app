from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from rest_framework import generics, permissions, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminUserRole
from auditlogs.models import AuditLog
from bookings.access_code import hash_code
from bookings.caretaker_serializers import CaretakerBookingListSerializer
from bookings.student_serializers import StudentBookingListSerializer
from hostels.models import RoomType
from payments.models import Payout

from .models import AccessCode, Booking, Dispute, Reservation, VerificationLog
from .serializers import (
    AdminDisputeUpdateSerializer,
    BookingSerializer,
    CheckoutSerializer,
    DisputeSerializer,
    HostBookingActionSerializer,
    ReservationSerializer,
)


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


class CheckoutAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role != "STUDENT":
            return Response({"detail": "Only students can checkout."}, status=403)

        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            room_type = RoomType.objects.select_for_update().get(
                id=serializer.validated_data["room_type_id"],
                is_active=True,
            )

            if room_type.available <= 0:
                return Response({"detail": "No available space for this room type."}, status=400)

            if room_type.booking_mode == RoomType.BookingMode.WHOLE_ROOM and room_type.capacity != 1:
                return Response({"detail": "Invalid room setup."}, status=400)

            room_type.held += 1
            room_type.save(update_fields=["held"])

            reservation = Reservation.objects.create(
                student=request.user,
                room_type=room_type,
                amount=Decimal(room_type.price),
                status=Reservation.Status.HELD,
            )

        write_audit_log(
            actor=request.user,
            action="RESERVATION_CREATED",
            target_model="Reservation",
            target_id=reservation.id,
            before_data={},
            after_data={
                "student_id": reservation.student_id,
                "room_type_id": reservation.room_type_id,
                "amount": str(reservation.amount),
                "status": reservation.status,
                "expires_at": reservation.expires_at.isoformat(),
            },
            description=f"Student created reservation #{reservation.id}.",
            request=request,
        )

        return Response(
            {
                "reservation": ReservationSerializer(reservation).data,
                "payment": {"provider": "PAYSTACK", "next": "initiate_payment"},
            },
            status=status.HTTP_201_CREATED,
        )


class IsCaretaker(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "CARETAKER"
        )


class VerifyAccessCodeAPIView(APIView):
    """
    Caretaker enters code to confirm it's valid and see who it belongs to.
    """
    permission_classes = [IsCaretaker]

    def post(self, request):
        from .verification_serializers import VerifyCodeSerializer

        s = VerifyCodeSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        raw_code = s.validated_data["code"].strip().upper()
        code_hash = hash_code(raw_code)

        try:
            access = AccessCode.objects.select_related(
                "booking",
                "booking__student",
                "booking__room_type",
                "booking__room_type__hostel",
            ).get(code_hash=code_hash)
        except AccessCode.DoesNotExist:
            return Response({"detail": "Invalid code."}, status=404)

        booking = access.booking
        hostel = booking.room_type.hostel

        if hostel.caretaker_id != request.user.id:
            return Response({"detail": "You are not allowed to verify this hostel's bookings."}, status=403)

        if access.status != AccessCode.Status.ACTIVE:
            return Response({"detail": f"Code is not active ({access.status})."}, status=400)

        if booking.status != Booking.Status.CONFIRMED:
            return Response({"detail": f"Booking is not confirmed ({booking.status})."}, status=400)

        VerificationLog.objects.create(
            booking=booking,
            caretaker=request.user,
            action=VerificationLog.Action.VERIFIED,
        )

        write_audit_log(
            actor=request.user,
            action="ACCESS_CODE_VERIFIED",
            target_model="Booking",
            target_id=booking.id,
            before_data={},
            after_data={
                "booking_status": booking.status,
                "access_code_status": access.status,
            },
            description=f"Caretaker verified access code for booking #{booking.id}.",
            request=request,
        )

        return Response(
            {
                "booking_id": booking.id,
                "student": {
                    "id": booking.student_id,
                    "name": booking.student.get_full_name() or booking.student.username,
                    "email": booking.student.email,
                    "phone": getattr(booking.student, "phone", None),
                },
                "hostel": {
                    "id": hostel.id,
                    "name": hostel.name,
                    "location_area": hostel.location_area,
                },
                "room_type": {"id": booking.room_type_id, "name": booking.room_type.name},
                "status": {"booking": booking.status, "code": access.status},
            },
            status=200,
        )


class CheckInAPIView(APIView):
    """
    Caretaker marks student as checked-in using the same code.
    """
    permission_classes = [IsCaretaker]

    def post(self, request):
        from .verification_serializers import CheckInSerializer

        s = CheckInSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        raw_code = s.validated_data["code"].strip().upper()
        code_hash = hash_code(raw_code)

        with transaction.atomic():
            try:
                access = AccessCode.objects.select_for_update().select_related(
                    "booking",
                    "booking__student",
                    "booking__room_type",
                    "booking__room_type__hostel",
                ).get(code_hash=code_hash)
            except AccessCode.DoesNotExist:
                return Response({"detail": "Invalid code."}, status=404)

            booking = access.booking
            hostel = booking.room_type.hostel

            if hostel.caretaker_id != request.user.id:
                return Response({"detail": "You are not allowed to check-in for this hostel."}, status=403)

            if access.status != AccessCode.Status.ACTIVE:
                return Response({"detail": f"Code is not active ({access.status})."}, status=400)

            if booking.status != Booking.Status.CONFIRMED:
                return Response({"detail": f"Booking is not confirmed ({booking.status})."}, status=400)

            before_booking = {
                "status": booking.status,
            }
            before_access = {
                "status": access.status,
                "used_at": access.used_at.isoformat() if access.used_at else None,
            }

            access.status = AccessCode.Status.USED
            access.used_at = timezone.now()
            access.save(update_fields=["status", "used_at"])

            booking.status = Booking.Status.CHECKED_IN
            booking.save(update_fields=["status"])

            VerificationLog.objects.create(
                booking=booking,
                caretaker=request.user,
                action=VerificationLog.Action.CHECKED_IN,
            )

            write_audit_log(
                actor=request.user,
                action="BOOKING_CHECKED_IN",
                target_model="Booking",
                target_id=booking.id,
                before_data=before_booking,
                after_data={"status": booking.status},
                description=f"Caretaker checked in booking #{booking.id}.",
                request=request,
            )

            write_audit_log(
                actor=request.user,
                action="ACCESS_CODE_USED",
                target_model="AccessCode",
                target_id=access.id,
                before_data=before_access,
                after_data={
                    "status": access.status,
                    "used_at": access.used_at.isoformat() if access.used_at else None,
                },
                description=f"Access code for booking #{booking.id} marked as used.",
                request=request,
            )

        return Response(
            {
                "detail": "Checked-in successfully.",
                "booking_id": booking.id,
                "student": booking.student.get_full_name() or booking.student.username,
                "hostel": hostel.name,
                "room_type": booking.room_type.name,
                "booking_status": booking.status,
            },
            status=200,
        )


class CaretakerBookingsAPIView(generics.ListAPIView):
    permission_classes = [IsCaretaker]
    serializer_class = CaretakerBookingListSerializer

    def get_queryset(self):
        caretaker_id = self.request.user.id
        return (
            Booking.objects.select_related("student", "room_type", "room_type__hostel")
            .filter(room_type__hostel__caretaker_id=caretaker_id)
            .order_by("-created_at")
        )


class StudentBookingsAPIView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = StudentBookingListSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role != "STUDENT":
            return Booking.objects.none()

        return (
            Booking.objects.select_related("room_type", "room_type__hostel")
            .filter(student=user)
            .order_by("-created_at")
        )


class CaretakerBookingActionAPIView(generics.UpdateAPIView):
    permission_classes = [IsCaretaker]
    serializer_class = HostBookingActionSerializer

    def get_queryset(self):
        return Booking.objects.select_related("room_type", "room_type__hostel").filter(
            room_type__hostel__caretaker_id=self.request.user.id
        )

    def update(self, request, *args, **kwargs):
        booking = self.get_object()
        serializer = self.get_serializer(booking, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data.get("host_confirmation_status")

        if booking.status == Booking.Status.CANCELLED:
            return Response({"detail": "Cancelled bookings cannot be updated by caretaker."}, status=400)

        with transaction.atomic():
            locked_booking = Booking.objects.select_for_update().get(id=booking.id)
            payout = Payout.objects.select_for_update().filter(booking=locked_booking).first()

            before_booking = {
                "host_confirmation_status": locked_booking.host_confirmation_status,
                "host_confirmed_at": locked_booking.host_confirmed_at.isoformat() if locked_booking.host_confirmed_at else None,
                "host_rejected_at": locked_booking.host_rejected_at.isoformat() if locked_booking.host_rejected_at else None,
                "host_rejection_reason": locked_booking.host_rejection_reason,
                "payout_status": locked_booking.payout_status,
                "payout_eligible_at": locked_booking.payout_eligible_at.isoformat() if locked_booking.payout_eligible_at else None,
            }

            before_payout = None
            if payout:
                before_payout = {
                    "status": payout.status,
                    "eligible_at": payout.eligible_at.isoformat() if payout.eligible_at else None,
                    "notes": payout.notes,
                }

            if new_status == Booking.HostConfirmationStatus.CONFIRMED:
                locked_booking.host_confirmation_status = Booking.HostConfirmationStatus.CONFIRMED
                locked_booking.host_confirmed_at = timezone.now()
                locked_booking.host_rejected_at = None
                locked_booking.host_rejection_reason = None

                if locked_booking.payout_status == Booking.PayoutStatus.NOT_ELIGIBLE:
                    locked_booking.payout_status = Booking.PayoutStatus.ELIGIBLE
                    locked_booking.payout_eligible_at = timezone.now()

                if payout and payout.status == Payout.Status.PENDING:
                    payout.status = Payout.Status.ELIGIBLE
                    payout.eligible_at = locked_booking.payout_eligible_at or timezone.now()
                    payout.save(update_fields=["status", "eligible_at"])

            elif new_status == Booking.HostConfirmationStatus.REJECTED:
                locked_booking.host_confirmation_status = Booking.HostConfirmationStatus.REJECTED
                locked_booking.host_rejected_at = timezone.now()
                locked_booking.host_rejection_reason = serializer.validated_data.get("host_rejection_reason")
                locked_booking.payout_status = Booking.PayoutStatus.NOT_ELIGIBLE
                locked_booking.payout_eligible_at = None

                if payout:
                    payout.status = Payout.Status.FAILED
                    payout.notes = (
                        (payout.notes or "") + "\nPayout blocked because caretaker rejected the booking."
                    ).strip()
                    payout.eligible_at = None
                    payout.save(update_fields=["status", "notes", "eligible_at"])

            locked_booking.save()

            write_audit_log(
                actor=request.user,
                action="BOOKING_HOST_CONFIRMATION_UPDATED",
                target_model="Booking",
                target_id=locked_booking.id,
                before_data=before_booking,
                after_data={
                    "host_confirmation_status": locked_booking.host_confirmation_status,
                    "host_confirmed_at": locked_booking.host_confirmed_at.isoformat() if locked_booking.host_confirmed_at else None,
                    "host_rejected_at": locked_booking.host_rejected_at.isoformat() if locked_booking.host_rejected_at else None,
                    "host_rejection_reason": locked_booking.host_rejection_reason,
                    "payout_status": locked_booking.payout_status,
                    "payout_eligible_at": locked_booking.payout_eligible_at.isoformat() if locked_booking.payout_eligible_at else None,
                },
                description=f"Caretaker updated host confirmation for booking #{locked_booking.id}.",
                request=request,
            )

            if payout:
                write_audit_log(
                    actor=request.user,
                    action="PAYOUT_SYNCED_FROM_HOST_CONFIRMATION",
                    target_model="Payout",
                    target_id=payout.id,
                    before_data=before_payout or {},
                    after_data={
                        "status": payout.status,
                        "eligible_at": payout.eligible_at.isoformat() if payout.eligible_at else None,
                        "notes": payout.notes,
                    },
                    description=f"Payout synced after caretaker action on booking #{locked_booking.id}.",
                    request=request,
                )

        return Response(BookingSerializer(locked_booking).data, status=200)


class StudentDisputeCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DisputeSerializer

    def get_queryset(self):
        if self.request.user.role != "STUDENT":
            return Dispute.objects.none()

        return Dispute.objects.select_related(
            "booking",
            "booking__room_type",
            "booking__room_type__hostel",
            "raised_by",
        ).filter(raised_by=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        user = self.request.user
        if user.role != "STUDENT":
            raise permissions.PermissionDenied("Only students can create disputes.")

        booking = serializer.validated_data["booking"]
        if booking.student_id != user.id:
            raise permissions.PermissionDenied("You can only raise disputes for your own bookings.")

        dispute = serializer.save(raised_by=user)

        write_audit_log(
            actor=user,
            action="DISPUTE_CREATED",
            target_model="Dispute",
            target_id=dispute.id,
            before_data={},
            after_data={
                "booking_id": dispute.booking_id,
                "category": dispute.category,
                "status": dispute.status,
            },
            description=f"Student created dispute #{dispute.id} for booking #{booking.id}.",
            request=self.request,
        )


class AdminDisputeListAPIView(generics.ListAPIView):
    permission_classes = [IsAdminUserRole]
    serializer_class = DisputeSerializer

    def get_queryset(self):
        queryset = Dispute.objects.select_related(
            "booking",
            "booking__student",
            "booking__room_type",
            "booking__room_type__hostel",
            "raised_by",
        ).order_by("-created_at")

        status_param = self.request.query_params.get("status")
        category = self.request.query_params.get("category")
        hostel_id = self.request.query_params.get("hostel")

        if status_param:
            queryset = queryset.filter(status=status_param)

        if category:
            queryset = queryset.filter(category=category)

        if hostel_id:
            queryset = queryset.filter(booking__room_type__hostel_id=hostel_id)

        return queryset


class AdminDisputeDetailAPIView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAdminUserRole]

    def get_queryset(self):
        return Dispute.objects.select_related(
            "booking",
            "booking__student",
            "booking__room_type",
            "booking__room_type__hostel",
            "raised_by",
        )

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return AdminDisputeUpdateSerializer
        return DisputeSerializer

    def perform_update(self, serializer):
        dispute = self.get_object()

        before_data = {
            "status": dispute.status,
            "resolution_notes": dispute.resolution_notes,
            "resolved_at": dispute.resolved_at.isoformat() if dispute.resolved_at else None,
        }

        dispute = serializer.save()

        write_audit_log(
            actor=self.request.user,
            action="DISPUTE_UPDATED",
            target_model="Dispute",
            target_id=dispute.id,
            before_data=before_data,
            after_data={
                "status": dispute.status,
                "resolution_notes": dispute.resolution_notes,
                "resolved_at": dispute.resolved_at.isoformat() if dispute.resolved_at else None,
            },
            description=f"Admin updated dispute #{dispute.id}.",
            request=self.request,
        )


class AdminBookingsAPIView(generics.ListAPIView):
    permission_classes = [IsAdminUserRole]
    serializer_class = BookingSerializer

    def get_queryset(self):
        queryset = Booking.objects.select_related(
            "student",
            "room_type",
            "room_type__hostel",
        ).order_by("-created_at")

        status_param = self.request.query_params.get("status")
        hostel_id = self.request.query_params.get("hostel")
        student_id = self.request.query_params.get("student")
        host_confirmation_status = self.request.query_params.get("host_confirmation_status")
        refund_status = self.request.query_params.get("refund_status")
        payout_status = self.request.query_params.get("payout_status")

        if status_param:
            queryset = queryset.filter(status=status_param)

        if hostel_id:
            queryset = queryset.filter(room_type__hostel_id=hostel_id)

        if student_id:
            queryset = queryset.filter(student_id=student_id)

        if host_confirmation_status:
            queryset = queryset.filter(host_confirmation_status=host_confirmation_status)

        if refund_status:
            queryset = queryset.filter(refund_status=refund_status)

        if payout_status:
            queryset = queryset.filter(payout_status=payout_status)

        return queryset


class AdminBookingDetailAPIView(generics.RetrieveAPIView):
    permission_classes = [IsAdminUserRole]
    serializer_class = BookingSerializer

    def get_queryset(self):
        return Booking.objects.select_related(
            "student",
            "room_type",
            "room_type__hostel",
        )