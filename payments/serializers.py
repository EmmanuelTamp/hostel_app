from rest_framework import serializers
from .models import Payment


class InitiatePaymentSerializer(serializers.Serializer):
    reservation_id = serializers.IntegerField()


class AdminPaymentSerializer(serializers.ModelSerializer):
    reservation_id = serializers.IntegerField(source="reservation.id", read_only=True)
    booking_id = serializers.IntegerField(source="booking.id", read_only=True)
    student = serializers.SerializerMethodField()
    hostel = serializers.SerializerMethodField()
    room_type = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = (
            "id",
            "provider",
            "reference",
            "amount",
            "status",
            "reservation_id",
            "booking_id",
            "student",
            "hostel",
            "room_type",
            "raw_payload",
            "created_at",
            "paid_at",
        )

    def get_student(self, obj):
        student = None

        if obj.booking and obj.booking.student:
            student = obj.booking.student
        elif obj.reservation and obj.reservation.student:
            student = obj.reservation.student

        if not student:
            return None

        return {
            "id": student.id,
            "name": student.get_full_name() or student.username,
            "email": student.email,
            "phone": getattr(student, "phone", None),
        }

    def get_hostel(self, obj):
        room_type = None

        if obj.booking and obj.booking.room_type:
            room_type = obj.booking.room_type
        elif obj.reservation and obj.reservation.room_type:
            room_type = obj.reservation.room_type

        if not room_type or not room_type.hostel:
            return None

        return {
            "id": room_type.hostel.id,
            "name": room_type.hostel.name,
            "location_area": room_type.hostel.location_area,
        }

    def get_room_type(self, obj):
        room_type = None

        if obj.booking and obj.booking.room_type:
            room_type = obj.booking.room_type
        elif obj.reservation and obj.reservation.room_type:
            room_type = obj.reservation.room_type

        if not room_type:
            return None

        return {
            "id": room_type.id,
            "name": room_type.name,
            "booking_mode": room_type.booking_mode,
            "price": room_type.price,
        }