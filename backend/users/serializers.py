from rest_framework import serializers
from .models import User, EmailVerification


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['id', 'email', 'password', 'verified', 'trust_score', 'created_at']
        read_only_fields = ['verified', 'trust_score', 'created_at']

    def validate_password(self, value):
        import re
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters.")
        if len(value) > 128:
            raise serializers.ValidationError("Password must be under 128 characters.")
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        if not re.search(r'[a-z]', value):
            raise serializers.ValidationError("Password must contain at least one lowercase letter.")
        if not re.search(r'[0-9]', value):
            raise serializers.ValidationError("Password must contain at least one number.")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            raise serializers.ValidationError("Password must contain at least one special character.")
        return value

    def validate_email(self, value):
        if not value.endswith('.edu'):
            raise serializers.ValidationError("Only .edu email addresses are allowed to register.")
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'verified', 'trust_score', 'created_at']


class EmailVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailVerification
        fields = ['id', 'user', 'code', 'expires_at', 'is_used', 'created_at']