from decimal import Decimal, InvalidOperation

from rest_framework import generics, permissions
from .models import Hostel, RoomType
from .serializers import (
    HostelListSerializer,
    HostelDetailSerializer,
    AdminHostelSerializer,
    AdminRoomTypeSerializer,
)
from accounts.permissions import IsAdminUserRole


class HostelListAPIView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = HostelListSerializer

    def get_queryset(self):
        queryset = Hostel.objects.filter(is_active=True)

        location = self.request.query_params.get("location")
        room_type = self.request.query_params.get("room_type")
        amenity = self.request.query_params.get("amenity")
        min_price = self.request.query_params.get("min_price")
        max_price = self.request.query_params.get("max_price")

        if location:
            queryset = queryset.filter(location_area__icontains=location.strip())

        if room_type:
            queryset = queryset.filter(room_types__name__icontains=room_type.strip())

        if amenity:
            queryset = queryset.filter(amenities__icontains=amenity.strip())

        if min_price:
            try:
                queryset = queryset.filter(room_types__price__gte=Decimal(min_price))
            except (InvalidOperation, TypeError, ValueError):
                pass

        if max_price:
            try:
                queryset = queryset.filter(room_types__price__lte=Decimal(max_price))
            except (InvalidOperation, TypeError, ValueError):
                pass

        return queryset.distinct().order_by("-created_at")


class HostelDetailAPIView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = HostelDetailSerializer
    queryset = Hostel.objects.filter(is_active=True).select_related("caretaker").prefetch_related("room_types", "images")


class AdminHostelListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUserRole]
    serializer_class = AdminHostelSerializer

    def get_queryset(self):
        return Hostel.objects.select_related("caretaker").order_by("-created_at")


class AdminHostelDetailAPIView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAdminUserRole]
    serializer_class = AdminHostelSerializer

    def get_queryset(self):
        return Hostel.objects.select_related("caretaker")


class AdminRoomTypeListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUserRole]
    serializer_class = AdminRoomTypeSerializer

    def get_queryset(self):
        queryset = RoomType.objects.select_related("hostel").order_by("-id")

        hostel_id = self.request.query_params.get("hostel")
        if hostel_id:
            queryset = queryset.filter(hostel_id=hostel_id)

        return queryset


class AdminRoomTypeDetailAPIView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAdminUserRole]
    serializer_class = AdminRoomTypeSerializer

    def get_queryset(self):
        return RoomType.objects.select_related("hostel")