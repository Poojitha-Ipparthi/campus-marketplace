from datetime import timedelta
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import EmailVerification
from .serializers import RegisterSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class SendVerificationCodeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        code = "123456"  # replace later with real random generation + email send
        EmailVerification.objects.create(
            user=request.user,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=10)
        )
        return Response({"detail": "Verification code generated."}, status=status.HTTP_201_CREATED)


class VerifyCodeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        code = request.data.get("code")

        verification = EmailVerification.objects.filter(
            user=request.user,
            code=code,
            is_used=False
        ).order_by('-created_at').first()

        if not verification:
            return Response({"detail": "Invalid verification code."}, status=status.HTTP_400_BAD_REQUEST)

        if verification.is_expired():
            return Response({"detail": "Verification code expired."}, status=status.HTTP_400_BAD_REQUEST)

        verification.is_used = True
        verification.save()

        request.user.verified = True
        request.user.save()

        return Response({"detail": "Email verified successfully."}, status=status.HTTP_200_OK)