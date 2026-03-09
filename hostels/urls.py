from django.urls import path
from .views import (
    HostelListAPIView,
    HostelDetailAPIView,
    AdminHostelListCreateAPIView,
    AdminHostelDetailAPIView,
    AdminRoomTypeListCreateAPIView,
    AdminRoomTypeDetailAPIView,
)

urlpatterns = [
    path("hostels/", HostelListAPIView.as_view(), name="hostel-list"),
    path("hostels/<int:pk>/", HostelDetailAPIView.as_view(), name="hostel-detail"),

    path("admin/hostels/", AdminHostelListCreateAPIView.as_view(), name="admin-hostel-list-create"),
    path("admin/hostels/<int:pk>/", AdminHostelDetailAPIView.as_view(), name="admin-hostel-detail"),

    path("admin/room-types/", AdminRoomTypeListCreateAPIView.as_view(), name="admin-roomtype-list-create"),
    path("admin/room-types/<int:pk>/", AdminRoomTypeDetailAPIView.as_view(), name="admin-roomtype-detail"),
]