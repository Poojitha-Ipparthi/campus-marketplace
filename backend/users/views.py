import random
import string
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
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
        # Generate a random 6-digit code
        code = ''.join(random.choices(string.digits, k=6))

        # Save to database with 10-minute expiry
        EmailVerification.objects.create(
            user=request.user,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=10)
        )

        # Send the real email
        try:
            send_mail(
                subject='Your Campus Marketplace Verification Code',
                message=f'Your verification code is: {code}\n\nThis code expires in 10 minutes.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[request.user.email],
                fail_silently=False,
            )
        except Exception as e:
            return Response(
                {"detail": "Failed to send verification email. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(
            {"detail": "Verification code sent to your email."},
            status=status.HTTP_201_CREATED
        )


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