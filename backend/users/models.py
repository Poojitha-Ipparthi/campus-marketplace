"""
Custom user and email verification models.

Stores user identity, verification state, trust score, and verification codes.
"""

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone
from datetime import timedelta


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        # Email is required because username login is disabled
        if not email:
            raise ValueError("Email is required")

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)

        # Hash password before saving
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        # Ensure superusers have admin permissions
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")

        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    # Disable username field and use email as login identifier
    username = None

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255, blank=True)

    # Tracks whether user completed email verification
    verified = models.BooleanField(default=False)

    # Trust score is updated from orders/reviews/reporting logic
    trust_score = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)

    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    @property
    def is_new_user(self):
        # Used to label recently joined users
        return self.created_at >= timezone.now() - timedelta(days=30)

    def __str__(self):
        return self.email


class EmailVerification(models.Model):
    # User this verification code belongs to
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="verification_codes"
    )

    code = models.CharField(max_length=10)
    expires_at = models.DateTimeField()

    # Prevent reuse of verification codes
    is_used = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    def is_expired(self):
        # Check if verification code is no longer valid
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"Verification for {self.user.email}"
