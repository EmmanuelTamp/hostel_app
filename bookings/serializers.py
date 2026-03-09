from rest_framework import serializers
from .models import Booking


class CheckoutSerializer(serializers.Serializer):
    room_type_id = serializers.IntegerField()


class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ("id", "room_type", "amount", "status", "created_at")