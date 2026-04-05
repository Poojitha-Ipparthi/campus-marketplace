from rest_framework import serializers
from .models import User, EmailVerification


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['id', 'email', 'password', 'verified', 'trust_score', 'created_at']
        read_only_fields = ['verified', 'trust_score', 'created_at']

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