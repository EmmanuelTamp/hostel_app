from rest_framework import generics, permissions

from accounts.permissions import IsAdminUserRole
from .models import Review
from .serializers import AdminReviewUpdateSerializer, ReviewSerializer


class HostelReviewListAPIView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = ReviewSerializer

    def get_queryset(self):
        queryset = Review.objects.select_related(
            "booking",
            "student",
            "hostel",
        ).filter(is_visible=True).order_by("-created_at")

        hostel_id = self.kwargs.get("hostel_id")
        if hostel_id:
            queryset = queryset.filter(hostel_id=hostel_id)

        return queryset


class StudentReviewListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ReviewSerializer

    def get_queryset(self):
        if self.request.user.role != "STUDENT":
            return Review.objects.none()

        return Review.objects.select_related(
            "booking",
            "student",
            "hostel",
        ).filter(student=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        user = self.request.user
        if user.role != "STUDENT":
            raise permissions.PermissionDenied("Only students can create reviews.")

        booking = serializer.validated_data["booking"]
        hostel = serializer.validated_data["hostel"]

        if booking.student_id != user.id:
            raise permissions.PermissionDenied("You can only review your own booking.")

        if booking.room_type.hostel_id != hostel.id:
            raise permissions.PermissionDenied("Hostel does not match the booking.")

        serializer.save(student=user)


class AdminReviewListAPIView(generics.ListAPIView):
    permission_classes = [IsAdminUserRole]
    serializer_class = ReviewSerializer

    def get_queryset(self):
        queryset = Review.objects.select_related(
            "booking",
            "student",
            "hostel",
        ).order_by("-created_at")

        hostel_id = self.request.query_params.get("hostel")
        rating = self.request.query_params.get("rating")
        is_visible = self.request.query_params.get("is_visible")

        if hostel_id:
            queryset = queryset.filter(hostel_id=hostel_id)

        if rating:
            queryset = queryset.filter(rating=rating)

        if is_visible is not None:
            if is_visible.lower() in ["true", "1", "yes"]:
                queryset = queryset.filter(is_visible=True)
            elif is_visible.lower() in ["false", "0", "no"]:
                queryset = queryset.filter(is_visible=False)

        return queryset


class AdminReviewDetailAPIView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAdminUserRole]

    def get_queryset(self):
        return Review.objects.select_related(
            "booking",
            "student",
            "hostel",
        )

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return AdminReviewUpdateSerializer
        return ReviewSerializer