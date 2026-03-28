from rest_framework import serializers
from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.username", read_only=True)

    class Meta:
        model = Review
        fields = (
            "id",
            "booking",
            "student",
            "student_name",
            "hostel",
            "rating",
            "comment",
            "is_visible",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "student",
            "student_name",
            "is_visible",
            "created_at",
            "updated_at",
        )


class AdminReviewUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = (
            "rating",
            "comment",
            "is_visible",
        )