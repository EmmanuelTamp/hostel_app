from rest_framework import serializers
from .models import Booking


class CaretakerBookingListSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_email = serializers.SerializerMethodField()
    student_phone = serializers.SerializerMethodField()

    hostel_name = serializers.CharField(source="room_type.hostel.name", read_only=True)
    hostel_id = serializers.IntegerField(source="room_type.hostel.id", read_only=True)
    room_type_name = serializers.CharField(source="room_type.name", read_only=True)

    access_code_status = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = (
            "id",
            "hostel_id",
            "hostel_name",
            "room_type_name",
            "amount",
            "status",
            "created_at",
            "student_name",
            "student_email",
            "student_phone",
            "access_code_status",
        )

    def get_student_name(self, obj):
        return obj.student.get_full_name() or obj.student.username

    def get_student_email(self, obj):
        return obj.student.email

    def get_student_phone(self, obj):
        return getattr(obj.student, "phone", None)

    def get_access_code_status(self, obj):
        if hasattr(obj, "access_code") and obj.access_code:
            return obj.access_code.status
        return None