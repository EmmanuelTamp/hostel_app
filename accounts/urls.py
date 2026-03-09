from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    StudentRegisterAPIView,
    MeAPIView,
    AdminCaretakerListCreateAPIView,
    AdminCaretakerDetailAPIView,
)

urlpatterns = [
    # Student registers here
    path("auth/register/", StudentRegisterAPIView.as_view(), name="student-register"),

    # Login for ANY user (student/caretaker/admin) with username+password
    path("auth/login/", TokenObtainPairView.as_view(), name="token-obtain-pair"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),

    # Get current user profile
    path("auth/me/", MeAPIView.as_view(), name="auth-me"),

    # Admin caretaker management
    path("admin/caretakers/", AdminCaretakerListCreateAPIView.as_view(), name="admin-caretaker-list-create"),
    path("admin/caretakers/<int:pk>/", AdminCaretakerDetailAPIView.as_view(), name="admin-caretaker-detail"),
]