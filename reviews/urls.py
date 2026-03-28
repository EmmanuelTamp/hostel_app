from django.urls import path
from .views import (
    AdminReviewDetailAPIView,
    AdminReviewListAPIView,
    HostelReviewListAPIView,
    StudentReviewListCreateAPIView,
)

urlpatterns = [
    path("hostels/<int:hostel_id>/reviews/", HostelReviewListAPIView.as_view(), name="hostel-reviews"),

    # student
    path("students/reviews/", StudentReviewListCreateAPIView.as_view(), name="student-reviews"),

    # admin
    path("admin/reviews/", AdminReviewListAPIView.as_view(), name="admin-reviews"),
    path("admin/reviews/<int:pk>/", AdminReviewDetailAPIView.as_view(), name="admin-review-detail"),
]