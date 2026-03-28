from rest_framework import serializers
from .models import Hostel, RoomType, HostelImage, Location


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = (
            "id",
            "name",
            "city",
            "region",
            "university_name",
            "campus_name",
            "description",
            "is_active",
        )


class RoomTypeSerializer(serializers.ModelSerializer):
    available = serializers.IntegerField(read_only=True)

    class Meta:
        model = RoomType
        fields = (
            "id",
            "name",
            "booking_mode",
            "price",
            "capacity",
            "booked",
            "held",
            "available",
            "condition",
            "is_active",
        )


class HostelImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = HostelImage
        fields = ("id", "image_url", "caption", "display_order")

    def get_image_url(self, obj):
        request = self.context.get("request")
        if not obj.image:
            return None
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url


class HostelListSerializer(serializers.ModelSerializer):
    location = LocationSerializer(read_only=True)
    min_price = serializers.SerializerMethodField()

    class Meta:
        model = Hostel
        fields = (
            "id",
            "name",
            "location_area",
            "location",
            "is_active",
            "min_price",
        )

    def get_min_price(self, obj):
        active_rooms = obj.room_types.filter(is_active=True).order_by("price")
        first_room = active_rooms.first()
        return first_room.price if first_room else None


class HostelDetailSerializer(serializers.ModelSerializer):
    location = LocationSerializer(read_only=True)
    room_types = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    caretaker_contact = serializers.SerializerMethodField()
    map_location = serializers.SerializerMethodField()

    class Meta:
        model = Hostel
        fields = (
            "id",
            "name",
            "location_area",
            "location",
            "address",
            "gps_lat",
            "gps_lng",
            "map_location",
            "description",
            "amenities",
            "rules",
            "caretaker",
            "caretaker_contact",
            "images",
            "room_types",
            "is_active",
        )

    def get_room_types(self, obj):
        room_types = obj.room_types.filter(is_active=True)
        return RoomTypeSerializer(room_types, many=True, context=self.context).data

    def get_images(self, obj):
        images = obj.images.filter(is_active=True)
        return HostelImageSerializer(images, many=True, context=self.context).data

    def get_caretaker_contact(self, obj):
        """
        For safety and business control, caretaker contact should only be exposed
        after confirmed payment in the actual view logic. This serializer still
        supports returning the data when the view explicitly allows it.
        """
        show_contact = self.context.get("show_caretaker_contact", False)
        if not show_contact:
            return None

        caretaker = obj.caretaker
        if not caretaker:
            return None

        return {
            "id": caretaker.id,
            "name": caretaker.get_full_name() or caretaker.username,
            "email": caretaker.email,
            "phone": getattr(caretaker, "phone", None),
        }

    def get_map_location(self, obj):
        if obj.gps_lat is None or obj.gps_lng is None:
            return None
        return {
            "lat": obj.gps_lat,
            "lng": obj.gps_lng,
        }


class AdminHostelSerializer(serializers.ModelSerializer):
    location = serializers.PrimaryKeyRelatedField(
        queryset=Location.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    location_detail = LocationSerializer(source="location", read_only=True)

    class Meta:
        model = Hostel
        fields = (
            "id",
            "name",
            "location_area",
            "location",
            "location_detail",
            "address",
            "gps_lat",
            "gps_lng",
            "description",
            "amenities",
            "rules",
            "caretaker",
            "is_active",
            "created_at",
        )
        read_only_fields = ("id", "created_at")

    def validate_caretaker(self, value):
        if value and value.role != "CARETAKER":
            raise serializers.ValidationError("Selected user must have CARETAKER role.")
        return value


class AdminRoomTypeSerializer(serializers.ModelSerializer):
    available = serializers.IntegerField(read_only=True)

    class Meta:
        model = RoomType
        fields = (
            "id",
            "hostel",
            "name",
            "booking_mode",
            "capacity",
            "booked",
            "held",
            "available",
            "price",
            "condition",
            "is_active",
        )
        read_only_fields = ("id", "available")

    def validate(self, attrs):
        booking_mode = attrs.get("booking_mode", getattr(self.instance, "booking_mode", None))
        capacity = attrs.get("capacity", getattr(self.instance, "capacity", None))
        booked = attrs.get("booked", getattr(self.instance, "booked", 0))
        held = attrs.get("held", getattr(self.instance, "held", 0))

        if booking_mode == RoomType.BookingMode.WHOLE_ROOM and capacity != 1:
            raise serializers.ValidationError(
                {"capacity": "Capacity must be 1 when booking mode is WHOLE_ROOM."}
            )

        if booked + held > capacity:
            raise serializers.ValidationError(
                {"held": "Booked plus held cannot be greater than capacity."}
            )

        return attrs