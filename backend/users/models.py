from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    username = None  # remove username field

    email = models.EmailField(unique=True)
    verified = models.BooleanField(default=False)

    ROLE_CHOICES = [
        ('USER', 'User'),
        ('ADMIN', 'Admin'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='USER')

    trust_score = models.DecimalField(max_digits=3, decimal_places=2, default=0.0)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
