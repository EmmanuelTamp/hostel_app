from rest_framework import serializers

from .models import Booking, Dispute, Reservation


class CheckoutSerializer(serializers.Serializer):
    room_type_id = serializers.IntegerField()


class ReservationSerializer(serializers.ModelSerializer):
    room_type_name = serializers.CharField(source="room_type.name", read_only=True)
    hostel_name = serializers.CharField(source="room_type.hostel.name", read_only=True)

    class Meta:
        model = Reservation
        fields = (
            "id",
            "student",
            "room_type",
            "room_type_name",
            "hostel_name",
            "amount",
            "status",
            "expires_at",
            "created_at",
        )
        read_only_fields = (
            "id",
            "student",
            "room_type_name",
            "hostel_name",
            "amount",
            "status",
            "expires_at",
            "created_at",
        )


class BookingSerializer(serializers.ModelSerializer):
    room_type_name = serializers.CharField(source="room_type.name", read_only=True)
    hostel_name = serializers.CharField(source="room_type.hostel.name", read_only=True)
    hostel_id = serializers.IntegerField(source="room_type.hostel.id", read_only=True)

    class Meta:
        model = Booking
        fields = (
            "id",
            "room_type",
            "room_type_name",
            "hostel_id",
            "hostel_name",
            "amount",
            "status",
            "host_confirmation_status",
            "host_confirmed_at",
            "host_rejected_at",
            "host_rejection_reason",
            "refund_status",
            "refund_amount",
            "refund_requested_at",
            "refund_processed_at",
            "payout_status",
            "payout_eligible_at",
            "payout_released_at",
            "commission_status",
            "cancelled_at",
            "cancellation_reason",
            "created_at",
        )
        read_only_fields = (
            "id",
            "room_type_name",
            "hostel_id",
            "hostel_name",
            "amount",
            "status",
            "host_confirmed_at",
            "host_rejected_at",
            "refund_requested_at",
            "refund_processed_at",
            "payout_eligible_at",
            "payout_released_at",
            "commission_status",
            "cancelled_at",
            "created_at",
        )


class HostBookingActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = (
            "host_confirmation_status",
            "host_rejection_reason",
        )

    def validate(self, attrs):
        instance = self.instance
        status_value = attrs.get("host_confirmation_status")
        reason = attrs.get("host_rejection_reason")

        if status_value not in [
            Booking.HostConfirmationStatus.CONFIRMED,
            Booking.HostConfirmationStatus.REJECTED,
        ]:
            raise serializers.ValidationError(
                {"host_confirmation_status": "Caretaker can only confirm or reject a booking."}
            )

        if instance and instance.host_confirmation_status == status_value:
            raise serializers.ValidationError(
                {"host_confirmation_status": "This booking already has that host confirmation status."}
            )

        if status_value == Booking.HostConfirmationStatus.REJECTED and not reason:
            raise serializers.ValidationError(
                {"host_rejection_reason": "Reason is required when rejecting a booking."}
            )

        if status_value == Booking.HostConfirmationStatus.CONFIRMED:
            attrs["host_rejection_reason"] = None

        return attrs


class DisputeSerializer(serializers.ModelSerializer):
    raised_by_name = serializers.CharField(source="raised_by.username", read_only=True)

    class Meta:
        model = Dispute
        fields = (
            "id",
            "booking",
            "raised_by",
            "raised_by_name",
            "category",
            "description",
            "status",
            "resolution_notes",
            "created_at",
            "resolved_at",
        )
        read_only_fields = (
            "id",
            "raised_by",
            "raised_by_name",
            "status",
            "resolution_notes",
            "created_at",
            "resolved_at",
        )


class AdminDisputeUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dispute
        fields = (
            "status",
            "resolution_notes",
            "resolved_at",
        )

    def validate(self, attrs):
        status_value = attrs.get("status", getattr(self.instance, "status", None))
        resolution_notes = attrs.get(
            "resolution_notes",
            getattr(self.instance, "resolution_notes", None),
        )
        resolved_at = attrs.get("resolved_at", getattr(self.instance, "resolved_at", None))

        if status_value in [Dispute.Status.RESOLVED, Dispute.Status.REJECTED]:
            if not resolution_notes:
                raise serializers.ValidationError(
                    {"resolution_notes": "Resolution notes are required for resolved or rejected disputes."}
                )
            if not resolved_at:
                raise serializers.ValidationError(
                    {"resolved_at": "resolved_at is required for resolved or rejected disputes."}
                )

        if status_value in [Dispute.Status.OPEN, Dispute.Status.UNDER_REVIEW] and resolved_at:
            raise serializers.ValidationError(
                {"resolved_at": "resolved_at should only be set when a dispute is resolved or rejected."}
            )

        return attrs