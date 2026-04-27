import random
import string
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import RegisterSerializer, UserSerializer
from .models import User, EmailVerification
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import VerifiedTokenObtainPairSerializer

class IsVerified(permissions.BasePermission):
    message = "Please verify your email before accessing this feature."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.verified)
    
    
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class SendVerificationCodeView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email")

        if not email:
            return Response(
                {"detail": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = User.objects.filter(email=email).first()

        if not user:
            return Response(
                {"detail": "No account found with this email."},
                status=status.HTTP_404_NOT_FOUND
            )

        if user.verified:
            return Response(
                {"detail": "This email is already verified."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Invalidate any existing unused codes first
        EmailVerification.objects.filter(
            user=user,
            is_used=False
        ).update(is_used=True)

        code = ''.join(random.choices(string.digits, k=6))

        EmailVerification.objects.create(
            user=user,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=10)
        )

        try:
            send_mail(
                subject='Your Campus Marketplace Verification Code',
                message=f'Your verification code is: {code}\n\nThis code expires in 10 minutes.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception:
            return Response(
                {"detail": "Failed to send verification email. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(
            {"detail": "Verification code sent to your email."},
            status=status.HTTP_201_CREATED
        )


class VerifyCodeView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email")
        code = request.data.get("code")

        if not email or not code:
            return Response(
                {"detail": "Email and verification code are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = User.objects.filter(email=email).first()

        if not user:
            return Response(
                {"detail": "No account found with this email."},
                status=status.HTTP_404_NOT_FOUND
            )

        verification = EmailVerification.objects.filter(
            user=user,
            code=code,
            is_used=False
        ).order_by('-created_at').first()

        if not verification:
            return Response(
                {"detail": "Invalid verification code."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if verification.is_expired():
            return Response(
                {"detail": "Verification code expired."},
                status=status.HTTP_400_BAD_REQUEST
            )

        verification.is_used = True
        verification.save()

        user.verified = True
        user.save()

        return Response(
            {"detail": "Email verified successfully."},
            status=status.HTTP_200_OK
        )
        
class VerifiedTokenObtainPairView(TokenObtainPairView):
    serializer_class = VerifiedTokenObtainPairSerializer