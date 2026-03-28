from decimal import Decimal

from rest_framework import serializers

from .models import Payment, Payout, RefundRequest


class InitiatePaymentSerializer(serializers.Serializer):
    reservation_id = serializers.IntegerField()
    callback_url = serializers.URLField(required=False, allow_blank=True)


class PaymentSerializer(serializers.ModelSerializer):
    reservation_id = serializers.IntegerField(source="reservation.id", read_only=True)
    booking_id = serializers.IntegerField(source="booking.id", read_only=True)

    class Meta:
        model = Payment
        fields = (
            "id",
            "provider",
            "reference",
            "amount",
            "room_amount",
            "platform_fee",
            "total_paid",
            "refunded_amount",
            "host_payout_amount",
            "platform_revenue_amount",
            "split_status",
            "status",
            "reservation_id",
            "booking_id",
            "created_at",
            "paid_at",
        )
        read_only_fields = fields


class RefundRequestSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.CharField(source="requested_by.username", read_only=True)

    class Meta:
        model = RefundRequest
        fields = (
            "id",
            "booking",
            "payment",
            "requested_by",
            "requested_by_name",
            "reason",
            "requested_amount",
            "approved_amount",
            "status",
            "admin_notes",
            "requested_at",
            "resolved_at",
        )
        read_only_fields = (
            "id",
            "requested_by",
            "requested_by_name",
            "approved_amount",
            "status",
            "admin_notes",
            "requested_at",
            "resolved_at",
        )

    def validate(self, attrs):
        payment = attrs.get("payment")
        booking = attrs.get("booking")
        requested_amount = attrs.get("requested_amount")

        if payment and booking and payment.booking_id != booking.id:
            raise serializers.ValidationError(
                {"payment": "Selected payment does not belong to the selected booking."}
            )

        if payment and payment.status not in [
            Payment.Status.SUCCESS,
            Payment.Status.PARTIALLY_REFUNDED,
        ]:
            raise serializers.ValidationError(
                {"payment": "Refund can only be requested from a successful or partially refunded payment."}
            )

        if requested_amount is not None and requested_amount <= Decimal("0.00"):
            raise serializers.ValidationError(
                {"requested_amount": "Requested amount must be greater than 0.00."}
            )

        if payment and requested_amount is not None and requested_amount > payment.room_amount:
            raise serializers.ValidationError(
                {"requested_amount": "Requested refund cannot exceed the room amount."}
            )

        if booking and booking.refund_status in [
            booking.RefundStatus.REQUESTED,
            booking.RefundStatus.APPROVED,
            booking.RefundStatus.PROCESSED,
        ]:
            raise serializers.ValidationError(
                {"booking": "This booking already has an active refund workflow."}
            )

        return attrs


class AdminRefundRequestUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RefundRequest
        fields = (
            "status",
            "approved_amount",
            "admin_notes",
            "resolved_at",
        )

    def validate(self, attrs):
        instance = self.instance

        status_value = attrs.get("status", getattr(instance, "status", None))
        approved_amount = attrs.get(
            "approved_amount",
            getattr(instance, "approved_amount", Decimal("0.00")),
        )
        admin_notes = attrs.get(
            "admin_notes",
            getattr(instance, "admin_notes", None),
        )
        resolved_at = attrs.get(
            "resolved_at",
            getattr(instance, "resolved_at", None),
        )
        payment = getattr(instance, "payment", None)

        if approved_amount is not None and approved_amount < Decimal("0.00"):
            raise serializers.ValidationError(
                {"approved_amount": "Approved amount cannot be negative."}
            )

        if payment and approved_amount is not None and approved_amount > payment.room_amount:
            raise serializers.ValidationError(
                {"approved_amount": "Approved amount cannot exceed the room amount."}
            )

        if status_value in [
            RefundRequest.Status.APPROVED,
            RefundRequest.Status.REJECTED,
            RefundRequest.Status.PROCESSED,
        ]:
            if not admin_notes:
                raise serializers.ValidationError(
                    {"admin_notes": "Admin notes are required for this refund decision."}
                )
            if not resolved_at:
                raise serializers.ValidationError(
                    {"resolved_at": "resolved_at is required for this refund decision."}
                )

        if status_value == RefundRequest.Status.REJECTED:
            if approved_amount != Decimal("0.00"):
                raise serializers.ValidationError(
                    {"approved_amount": "Approved amount must be 0.00 when a refund is rejected."}
                )

        if status_value in [RefundRequest.Status.APPROVED, RefundRequest.Status.PROCESSED]:
            if approved_amount is None or approved_amount <= Decimal("0.00"):
                raise serializers.ValidationError(
                    {"approved_amount": "Approved amount must be greater than 0.00 when refund is approved or processed."}
                )

        if status_value == RefundRequest.Status.PROCESSED and payment:
            if approved_amount > payment.room_amount:
                raise serializers.ValidationError(
                    {"approved_amount": "Processed refund cannot exceed the room amount."}
                )

        return attrs


class PayoutSerializer(serializers.ModelSerializer):
    caretaker_name = serializers.CharField(source="caretaker.username", read_only=True)
    payment_reference = serializers.CharField(source="payment.reference", read_only=True)

    class Meta:
        model = Payout
        fields = (
            "id",
            "booking",
            "payment",
            "payment_reference",
            "caretaker",
            "caretaker_name",
            "amount",
            "status",
            "eligible_at",
            "released_at",
            "reference",
            "notes",
            "created_at",
        )
        read_only_fields = (
            "id",
            "payment_reference",
            "caretaker_name",
            "created_at",
        )


class AdminPayoutUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payout
        fields = (
            "status",
            "eligible_at",
            "released_at",
            "reference",
            "notes",
        )

    def validate(self, attrs):
        instance = self.instance

        status_value = attrs.get("status", getattr(instance, "status", None))
        eligible_at = attrs.get("eligible_at", getattr(instance, "eligible_at", None))
        released_at = attrs.get("released_at", getattr(instance, "released_at", None))
        reference = attrs.get("reference", getattr(instance, "reference", None))

        if status_value in [Payout.Status.ELIGIBLE, Payout.Status.PROCESSING, Payout.Status.RELEASED]:
            if not eligible_at:
                raise serializers.ValidationError(
                    {"eligible_at": "eligible_at is required once payout becomes eligible or beyond."}
                )

        if status_value in [Payout.Status.PENDING, Payout.Status.FAILED]:
            if released_at:
                raise serializers.ValidationError(
                    {"released_at": "released_at cannot be set while payout is pending or failed."}
                )

        if status_value == Payout.Status.RELEASED:
            if not released_at:
                raise serializers.ValidationError(
                    {"released_at": "released_at is required when payout is released."}
                )
            if not reference:
                raise serializers.ValidationError(
                    {"reference": "Reference is required when payout is released."}
                )

        return attrs


class AdminPaymentSerializer(serializers.ModelSerializer):
    reservation_id = serializers.IntegerField(source="reservation.id", read_only=True)
    booking_id = serializers.IntegerField(source="booking.id", read_only=True)
    student = serializers.SerializerMethodField()
    hostel = serializers.SerializerMethodField()
    room_type = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = (
            "id",
            "provider",
            "reference",
            "amount",
            "room_amount",
            "platform_fee",
            "total_paid",
            "refunded_amount",
            "host_payout_amount",
            "platform_revenue_amount",
            "split_status",
            "status",
            "reservation_id",
            "booking_id",
            "student",
            "hostel",
            "room_type",
            "raw_payload",
            "created_at",
            "paid_at",
        )

    def get_student(self, obj):
        student = None

        if obj.booking and obj.booking.student:
            student = obj.booking.student
        elif obj.reservation and obj.reservation.student:
            student = obj.reservation.student

        if not student:
            return None

        return {
            "id": student.id,
            "name": student.get_full_name() or student.username,
            "email": student.email,
            "phone": getattr(student, "phone", None),
        }

    def get_hostel(self, obj):
        room_type = None

        if obj.booking and obj.booking.room_type:
            room_type = obj.booking.room_type
        elif obj.reservation and obj.reservation.room_type:
            room_type = obj.reservation.room_type

        if not room_type or not room_type.hostel:
            return None

        return {
            "id": room_type.hostel.id,
            "name": room_type.hostel.name,
            "location_area": room_type.hostel.location_area,
            "location": room_type.hostel.location.name if room_type.hostel.location else None,
        }

    def get_room_type(self, obj):
        room_type = None

        if obj.booking and obj.booking.room_type:
            room_type = obj.booking.room_type
        elif obj.reservation and obj.reservation.room_type:
            room_type = obj.reservation.room_type

        if not room_type:
            return None

        return {
            "id": room_type.id,
            "name": room_type.name,
            "booking_mode": room_type.booking_mode,
            "price": room_type.price,
        }