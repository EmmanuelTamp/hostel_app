from rest_framework import serializers

class VerifyCodeSerializer(serializers.Serializer):
    code = serializers.CharField(min_length=6, max_length=32)

class CheckInSerializer(serializers.Serializer):
    code = serializers.CharField(min_length=6, max_length=32)