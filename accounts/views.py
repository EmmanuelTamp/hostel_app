from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from django.contrib.auth import get_user_model
from .serializers import StudentRegisterSerializer, UserMeSerializer, CaretakerAdminSerializer
from .permissions import IsAdminUserRole

User = get_user_model()


class StudentRegisterAPIView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = StudentRegisterSerializer


class MeAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserMeSerializer(request.user).data)


class AdminCaretakerListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUserRole]
    serializer_class = CaretakerAdminSerializer

    def get_queryset(self):
        return User.objects.filter(role="CARETAKER").order_by("-id")


class AdminCaretakerDetailAPIView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAdminUserRole]
    serializer_class = CaretakerAdminSerializer

    def get_queryset(self):
        return User.objects.filter(role="CARETAKER")