from rest_framework import serializers
from .models import Booking


class StudentBookingListSerializer(serializers.ModelSerializer):
    hostel_name = serializers.CharField(source="room_type.hostel.name", read_only=True)
    hostel_location = serializers.CharField(source="room_type.hostel.location_area", read_only=True)
    room_type_name = serializers.CharField(source="room_type.name", read_only=True)

    access_code_status = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = (
            "id",
            "hostel_name",
            "hostel_location",
            "room_type_name",
            "amount",
            "status",
            "created_at",
            "access_code_status",
        )

    def get_access_code_status(self, obj):
        if hasattr(obj, "access_code") and obj.access_code:
            return obj.access_code.status
        return None