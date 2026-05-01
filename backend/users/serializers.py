"""
Serializers for authentication and user profile APIs.

Handles registration, verification, login validation, and profile data.
"""

from rest_framework import serializers
from .models import User, EmailVerification
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.exceptions import AuthenticationFailed


class RegisterSerializer(serializers.ModelSerializer):
    # Password is accepted from request but never returned in response
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "password",
            "full_name",
            "verified",
            "trust_score",
            "created_at",
        ]

        # These fields are controlled by backend logic
        read_only_fields = ["verified", "trust_score", "created_at"]

    def validate_password(self, value):
        import re

        # Enforce strong password rules
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters.")
        if len(value) > 128:
            raise serializers.ValidationError("Password must be under 128 characters.")
        if not re.search(r"[A-Z]", value):
            raise serializers.ValidationError(
                "Password must contain at least one uppercase letter."
            )
        if not re.search(r"[a-z]", value):
            raise serializers.ValidationError(
                "Password must contain at least one lowercase letter."
            )
        if not re.search(r"[0-9]", value):
            raise serializers.ValidationError(
                "Password must contain at least one number."
            )
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            raise serializers.ValidationError(
                "Password must contain at least one special character."
            )

        return value

    def validate_email(self, value):
        # Restrict registration to university emails
        if not value.endswith(".edu"):
            raise serializers.ValidationError(
                "Only .edu email addresses are allowed to register."
            )

        return value

    def create(self, validated_data):
        # Use custom manager so password is hashed correctly
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "verified",
            "trust_score",
            "is_new_user",
            "is_staff",
            "is_superuser",
            "created_at",
        ]

        # Prevent users from editing system/admin-controlled fields
        read_only_fields = [
            "id",
            "email",
            "verified",
            "trust_score",
            "is_new_user",
            "is_staff",
            "is_superuser",
            "created_at",
        ]


class EmailVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailVerification
        fields = ["id", "user", "code", "expires_at", "is_used", "created_at"]


class VerifiedTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        # Block login until user verifies email
        if not self.user.verified:
            raise AuthenticationFailed("Please verify your email before logging in.")

        return data


class PasswordResetRequestSerializer(serializers.Serializer):
    # Email used to send password reset code
    email = serializers.EmailField()


class PasswordResetVerifyCodeSerializer(serializers.Serializer):
    # Email and code used to verify reset request
    email = serializers.EmailField()
    code = serializers.CharField(max_length=10)


class PasswordResetConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=10)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate_new_password(self, value):
        # Reuse registration password rules
        return RegisterSerializer().validate_password(value)

    def validate(self, attrs):
        # Confirm both password fields match
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": ["Passwords do not match."]}
            )

        return attrs
