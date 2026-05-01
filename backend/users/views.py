"""
API views for authentication, verification, profiles, and admin controls.

Handles signup, login, email verification, password reset, and admin management.
"""

import random
import string
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User, EmailVerification
from .serializers import (
    RegisterSerializer,
    UserSerializer,
    VerifiedTokenObtainPairSerializer,
    PasswordResetRequestSerializer,
    PasswordResetVerifyCodeSerializer,
    PasswordResetConfirmSerializer,
)
from listings.models import Listing
from orders.models import Order, Payment
from .admin_serializers import (
    AdminUserSerializer,
    AdminListingSerializer,
    AdminOrderSerializer,
    AdminPaymentSerializer,
)

from listings.models import Listing
from orders.models import Order, Payment


class IsVerified(permissions.BasePermission):
    message = "Please verify your email before accessing this feature."

    def has_permission(self, request, view):
        # Allow only authenticated users who have verified their email
        return bool(
            request.user and request.user.is_authenticated and request.user.verified
        )


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]  # Registration is open to everyone


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Return the profile of the currently authenticated user
        return Response(UserSerializer(request.user).data)


class SendVerificationCodeView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email")

        if not email:
            return Response(
                {"detail": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email=email).first()

        if not user:
            return Response(
                {"detail": "No account found with this email."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if user.verified:
            return Response(
                {"detail": "This email is already verified."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Invalidate any previously unused codes before issuing a new one
        EmailVerification.objects.filter(user=user, is_used=False).update(is_used=True)

        # Generate a 6-digit numeric code
        code = "".join(random.choices(string.digits, k=6))

        EmailVerification.objects.create(
            user=user,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        try:
            send_mail(
                subject="Your Campus Marketplace Verification Code",
                message=f"Your verification code is: {code}\n\nThis code expires in 10 minutes.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception:
            return Response(
                {"detail": "Failed to send verification email. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"detail": "Verification code sent to your email."},
            status=status.HTTP_201_CREATED,
        )


class VerifyCodeView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email")
        code = request.data.get("code")

        if not email or not code:
            return Response(
                {"detail": "Email and verification code are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email=email).first()

        if not user:
            return Response(
                {"detail": "No account found with this email."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Fetch the most recent unused code that matches
        verification = (
            EmailVerification.objects.filter(user=user, code=code, is_used=False)
            .order_by("-created_at")
            .first()
        )

        if not verification:
            return Response(
                {"detail": "Invalid verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if verification.is_expired():
            return Response(
                {"detail": "Verification code expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Consume the code and mark the user as verified
        verification.is_used = True
        verification.save(update_fields=["is_used"])

        user.verified = True
        user.save(update_fields=["verified"])

        return Response(
            {"detail": "Email verified successfully."},
            status=status.HTTP_200_OK,
        )


class VerifiedTokenObtainPairView(TokenObtainPairView):
    # Blocks login for users who haven't verified their email
    serializer_class = VerifiedTokenObtainPairSerializer


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].lower()
        user = User.objects.filter(email=email).first()

        if user:
            code = str(random.randint(100000, 999999))

            EmailVerification.objects.create(
                user=user,
                code=code,
                expires_at=timezone.now() + timedelta(minutes=10),
            )

            send_mail(
                subject="Campus Marketplace password reset code",
                message=f"Your password reset code is {code}. It expires in 10 minutes.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )

        # Always return 200 regardless of whether the email exists (prevents enumeration)
        return Response(
            {"detail": "If that email exists, a password reset code has been sent."},
            status=status.HTTP_200_OK,
        )


class PasswordResetVerifyCodeView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetVerifyCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].lower()
        code = serializer.validated_data["code"]

        user = User.objects.filter(email=email).first()

        if not user:
            return Response(
                {"detail": "Invalid or expired reset code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        verification = (
            EmailVerification.objects.filter(user=user, code=code, is_used=False)
            .order_by("-created_at")
            .first()
        )

        if not verification or verification.is_expired():
            return Response(
                {"detail": "Invalid or expired reset code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Code is valid — client can proceed to the confirm step
        return Response(
            {"detail": "Reset code verified."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].lower()
        code = serializer.validated_data["code"]
        new_password = serializer.validated_data["new_password"]

        user = User.objects.filter(email=email).first()

        if not user:
            return Response(
                {"detail": "Invalid or expired reset code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        verification = (
            EmailVerification.objects.filter(user=user, code=code, is_used=False)
            .order_by("-created_at")
            .first()
        )

        if not verification or verification.is_expired():
            return Response(
                {"detail": "Invalid or expired reset code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Hash and save the new password, then consume the reset code
        user.set_password(new_password)
        user.save(update_fields=["password"])

        verification.is_used = True
        verification.save(update_fields=["is_used"])

        return Response(
            {"detail": "Password reset successfully."},
            status=status.HTTP_200_OK,
        )


class IsAdminUserOnly(permissions.BasePermission):
    message = "Admin access required."

    def has_permission(self, request, view):
        # Restrict to authenticated staff/admin users only
        return bool(
            request.user and request.user.is_authenticated and request.user.is_staff
        )


class AdminStatsView(APIView):
    permission_classes = [IsAdminUserOnly]

    def get(self, request):
        # Aggregate system-wide counts for the admin dashboard
        data = {
            "total_users": User.objects.count(),
            "active_users": User.objects.filter(is_active=True).count(),
            "verified_users": User.objects.filter(verified=True).count(),
            "total_listings": Listing.objects.count(),
            "available_listings": Listing.objects.filter(
                status=Listing.Status.AVAILABLE
            ).count(),
            "sold_listings": Listing.objects.filter(status=Listing.Status.SOLD).count(),
            "reserved_listings": Listing.objects.filter(
                status=Listing.Status.RESERVED
            ).count(),
            "total_orders": Order.objects.count(),
            "pending_orders": Order.objects.filter(status=Order.Status.PENDING).count(),
            "completed_orders": Order.objects.filter(
                status=Order.Status.COMPLETED
            ).count(),
            "total_payments": Payment.objects.count(),
        }

        return Response(data, status=status.HTTP_200_OK)


class AdminUserListView(generics.ListAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminUserOnly]

    def get_queryset(self):
        return User.objects.all().order_by("-created_at")


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminUserOnly]
    queryset = User.objects.all()

    def patch(self, request, *args, **kwargs):
        user = self.get_object()

        # Whitelist of fields an admin is permitted to update
        allowed_fields = ["full_name", "verified", "is_active", "is_staff"]
        changed_fields = []

        for field in allowed_fields:
            if field in request.data:
                setattr(user, field, request.data[field])
                changed_fields.append(field)

        if changed_fields:
            user.save(update_fields=changed_fields)

        return Response(AdminUserSerializer(user).data)


class AdminUserDeactivateView(APIView):
    permission_classes = [IsAdminUserOnly]

    def post(self, request, pk):
        user = User.objects.filter(pk=pk).first()

        if not user:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Prevent an admin from locking themselves out
        if user == request.user:
            return Response(
                {"detail": "You cannot deactivate your own admin account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.is_active = False
        user.save(update_fields=["is_active"])

        return Response(
            {"detail": "User deactivated successfully."},
            status=status.HTTP_200_OK,
        )


class AdminListingListView(generics.ListAPIView):
    serializer_class = AdminListingSerializer
    permission_classes = [IsAdminUserOnly]

    def get_queryset(self):
        # Prefetch seller to avoid N+1 queries
        return Listing.objects.select_related("seller").order_by("-created_at")


class AdminListingDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = AdminListingSerializer
    permission_classes = [IsAdminUserOnly]
    queryset = Listing.objects.select_related("seller").all()

    def patch(self, request, *args, **kwargs):
        listing = self.get_object()

        # Whitelist of fields an admin is permitted to update
        allowed_fields = ["title", "price", "status", "condition"]
        changed_fields = []

        for field in allowed_fields:
            if field in request.data:
                setattr(listing, field, request.data[field])
                changed_fields.append(field)

        if changed_fields:
            listing.save(update_fields=changed_fields)

        return Response(AdminListingSerializer(listing).data)


class AdminListingDeleteView(APIView):
    permission_classes = [IsAdminUserOnly]

    def delete(self, request, pk):
        listing = Listing.objects.filter(pk=pk).first()

        if not listing:
            return Response(
                {"detail": "Listing not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        listing.delete()

        return Response(
            {"detail": "Listing removed successfully."},
            status=status.HTTP_200_OK,
        )


class AdminOrderListView(generics.ListAPIView):
    serializer_class = AdminOrderSerializer
    permission_classes = [IsAdminUserOnly]

    def get_queryset(self):
        # Prefetch related models to avoid N+1 queries
        return Order.objects.select_related(
            "buyer",
            "listing",
            "listing__seller",
        ).order_by("-created_at")


class AdminOrderDetailView(generics.RetrieveAPIView):
    serializer_class = AdminOrderSerializer
    permission_classes = [IsAdminUserOnly]
    queryset = Order.objects.select_related(
        "buyer",
        "listing",
        "listing__seller",
    ).all()


class AdminPaymentListView(APIView):
    permission_classes = [IsAdminUserOnly]

    def get(self, request):
        print(
            "ADMIN PAYMENTS COUNT:", Payment.objects.count()
        )  # TODO: remove debug logs
        print("ADMIN PAYMENTS:", list(Payment.objects.all().values()))

        payments = Payment.objects.select_related("order").order_by("-created_at")
        serializer = AdminPaymentSerializer(payments, many=True)

        return Response(serializer.data, status=status.HTTP_200_OK)
