from decimal import Decimal
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from hostels.models import RoomType
from .models import Booking, Reservation
from .serializers import CheckoutSerializer, BookingSerializer

from django.db import transaction
from django.utils import timezone

from rest_framework import generics
from .caretaker_serializers import CaretakerBookingListSerializer

from bookings.student_serializers import StudentBookingListSerializer
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsAdminUserRole

from bookings.access_code import hash_code
from bookings.models import AccessCode, Booking, VerificationLog
from hostels.models import Hostel


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
                is_active=True
            )

            # availability check with row lock
            if room_type.available <= 0:
                return Response({"detail": "No available space for this room type."}, status=400)

            # enforce WHOLE_ROOM rule: capacity must be 1 already, but extra guard
            if room_type.booking_mode == "WHOLE_ROOM" and room_type.capacity != 1:
                return Response({"detail": "Invalid room setup."}, status=400)

            room_type.held += 1
            room_type.save(update_fields=["held"])

            reservation = Reservation.objects.create(
                student=request.user,
                room_type=room_type,
                amount=Decimal(room_type.price),
                status=Reservation.Status.HELD,
            )

        return Response(
            {
                "reservation": {
                    "id": reservation.id,
                    "student": reservation.student_id,
                    "room_type": reservation.room_type_id,
                    "amount": str(reservation.amount),
                    "status": reservation.status,
                    "expires_at": reservation.expires_at,
                    "created_at": reservation.created_at,
                },
                "payment": {"provider": "PAYSTACK", "next": "initiate_payment"},
            },
            status=status.HTTP_201_CREATED,
        )
    

class IsCaretaker(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "CARETAKER")


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
                "booking", "booking__student", "booking__room_type", "booking__room_type__hostel"
            ).get(code_hash=code_hash)
        except AccessCode.DoesNotExist:
            return Response({"detail": "Invalid code."}, status=404)

        booking = access.booking
        hostel = booking.room_type.hostel

        # Ensure caretaker owns this hostel
        if hostel.caretaker_id != request.user.id:
            return Response({"detail": "You are not allowed to verify this hostel's bookings."}, status=403)

        if access.status != AccessCode.Status.ACTIVE:
            return Response({"detail": f"Code is not active ({access.status})."}, status=400)

        if booking.status != Booking.Status.CONFIRMED:
            return Response({"detail": f"Booking is not confirmed ({booking.status})."}, status=400)

        # Log "verified"
        VerificationLog.objects.create(
            booking=booking,
            caretaker=request.user,
            action=VerificationLog.Action.VERIFIED,
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
                "hostel": {"id": hostel.id, "name": hostel.name, "location_area": hostel.location_area},
                "room_type": {"id": booking.room_type_id, "name": booking.room_type.name},
                "status": {"booking": booking.status, "code": access.status},
            },
            status=200,
        )


class CheckInAPIView(APIView):
    """
    Caretaker marks student as checked-in using the same code.
    This consumes the code (USED) and marks booking CHECKED_IN.
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
                    "booking", "booking__student", "booking__room_type", "booking__room_type__hostel"
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

            # Consume code + check-in
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
    """
    Caretaker sees ALL bookings for hostels they manage (C).
    """
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
    """
    Student sees their own bookings (all statuses).
    """
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


class AdminBookingsAPIView(generics.ListAPIView):
    permission_classes = [IsAdminUserRole]
    serializer_class = BookingSerializer

    def get_queryset(self):
        queryset = Booking.objects.select_related("student", "room_type", "room_type__hostel").order_by("-created_at")

        status_param = self.request.query_params.get("status")
        hostel_id = self.request.query_params.get("hostel")
        student_id = self.request.query_params.get("student")

        if status_param:
            queryset = queryset.filter(status=status_param)

        if hostel_id:
            queryset = queryset.filter(room_type__hostel_id=hostel_id)

        if student_id:
            queryset = queryset.filter(student_id=student_id)

        return queryset


class AdminBookingDetailAPIView(generics.RetrieveAPIView):
    permission_classes = [IsAdminUserRole]
    serializer_class = BookingSerializer

    def get_queryset(self):
        return Booking.objects.select_related("student", "room_type", "room_type__hostel")