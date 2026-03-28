from decimal import Decimal, InvalidOperation

from django.db import models
from rest_framework import generics, permissions
from .models import Hostel, Location, RoomType
from .serializers import (
    AdminHostelSerializer,
    AdminRoomTypeSerializer,
    HostelDetailSerializer,
    HostelListSerializer,
    LocationSerializer,
)
from accounts.permissions import IsAdminUserRole

class HostelListAPIView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = HostelListSerializer

    def get_queryset(self):
        queryset = (
            Hostel.objects.filter(is_active=True)
            .select_related("caretaker", "location")
            .prefetch_related("room_types", "images")
        )

        location = self.request.query_params.get("location")
        city = self.request.query_params.get("city")
        region = self.request.query_params.get("region")
        university = self.request.query_params.get("university")
        campus = self.request.query_params.get("campus")
        room_type = self.request.query_params.get("room_type")
        amenity = self.request.query_params.get("amenity")
        min_price = self.request.query_params.get("min_price")
        max_price = self.request.query_params.get("max_price")
        has_coordinates = self.request.query_params.get("has_coordinates")

        if location:
            location = location.strip()
            queryset = queryset.filter(
                is_active=True,
            ).filter(
                (
                    models.Q(location_area__icontains=location)
                    | models.Q(location__name__icontains=location)
                )
            )

        if city:
            queryset = queryset.filter(location__city__icontains=city.strip())

        if region:
            queryset = queryset.filter(location__region__icontains=region.strip())

        if university:
            queryset = queryset.filter(location__university_name__icontains=university.strip())

        if campus:
            queryset = queryset.filter(location__campus_name__icontains=campus.strip())

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

        if has_coordinates and has_coordinates.lower() in ["1", "true", "yes"]:
            queryset = queryset.filter(gps_lat__isnull=False, gps_lng__isnull=False)

        return queryset.distinct().order_by("-created_at")


class HostelDetailAPIView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = HostelDetailSerializer

    def get_queryset(self):
        return (
            Hostel.objects.filter(is_active=True)
            .select_related("caretaker", "location")
            .prefetch_related("room_types", "images")
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["show_caretaker_contact"] = False
        return context


class LocationListAPIView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = LocationSerializer

    def get_queryset(self):
        queryset = Location.objects.filter(is_active=True).order_by("name", "id")

        city = self.request.query_params.get("city")
        region = self.request.query_params.get("region")
        university = self.request.query_params.get("university")
        campus = self.request.query_params.get("campus")

        if city:
            queryset = queryset.filter(city__icontains=city.strip())

        if region:
            queryset = queryset.filter(region__icontains=region.strip())

        if university:
            queryset = queryset.filter(university_name__icontains=university.strip())

        if campus:
            queryset = queryset.filter(campus_name__icontains=campus.strip())

        return queryset


class AdminHostelListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUserRole]
    serializer_class = AdminHostelSerializer

    def get_queryset(self):
        return Hostel.objects.select_related("caretaker", "location").order_by("-created_at")


class AdminHostelDetailAPIView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAdminUserRole]
    serializer_class = AdminHostelSerializer

    def get_queryset(self):
        return Hostel.objects.select_related("caretaker", "location")


class AdminRoomTypeListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUserRole]
    serializer_class = AdminRoomTypeSerializer

    def get_queryset(self):
        queryset = RoomType.objects.select_related("hostel", "hostel__location").order_by("-id")

        hostel_id = self.request.query_params.get("hostel")
        booking_mode = self.request.query_params.get("booking_mode")
        is_active = self.request.query_params.get("is_active")

        if hostel_id:
            queryset = queryset.filter(hostel_id=hostel_id)

        if booking_mode:
            queryset = queryset.filter(booking_mode=booking_mode)

        if is_active is not None:
            if is_active.lower() in ["true", "1", "yes"]:
                queryset = queryset.filter(is_active=True)
            elif is_active.lower() in ["false", "0", "no"]:
                queryset = queryset.filter(is_active=False)

        return queryset


class AdminRoomTypeDetailAPIView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAdminUserRole]
    serializer_class = AdminRoomTypeSerializer

    def get_queryset(self):
        return RoomType.objects.select_related("hostel", "hostel__location")