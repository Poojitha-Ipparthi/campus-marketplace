from rest_framework import serializers
from .models import BlockedUser, Report


class BlockedUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlockedUser
        fields = ["id", "blocker", "blocked", "created_at"]
        read_only_fields = ["blocker", "created_at"]

    def validate(self, attrs):
        request = self.context.get("request")
        blocked = attrs.get("blocked")

        if not request or not request.user.is_authenticated:
            return attrs

        if blocked == request.user:
            raise serializers.ValidationError({
                "blocked": "A user cannot block themselves."
            })

        if blocked and BlockedUser.objects.filter(
            blocker=request.user,
            blocked=blocked
        ).exists():
            raise serializers.ValidationError({
                "blocked": "This user is already blocked."
            })

        return attrs


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = [
            "id",
            "reporter",
            "reported_user",
            "reported_listing",
            "reported_message",
            "reason",
            "status",
            "created_at",
        ]
        read_only_fields = ["reporter", "status", "created_at"]

    def validate(self, attrs):
        reported_user = attrs.get("reported_user")
        reported_listing = attrs.get("reported_listing")
        reported_message = attrs.get("reported_message")

        if not any([reported_user, reported_listing, reported_message]):
            raise serializers.ValidationError({
                "detail": "A report must target at least one user, listing, or message."
            })

        return attrs