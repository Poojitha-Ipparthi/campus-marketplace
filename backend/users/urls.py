from django.urls import path
from .views import (
    RegisterView,
    MeView,
    SendVerificationCodeView,
    VerifyCodeView,
    PasswordResetRequestView,
    PasswordResetVerifyCodeView,
    PasswordResetConfirmView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("me/", MeView.as_view(), name="me"),
    path(
        "send-verification-code/",
        SendVerificationCodeView.as_view(),
        name="send-verification-code",
    ),
    path("verify-code/", VerifyCodeView.as_view(), name="verify-code"),
    path("password-reset/request/", PasswordResetRequestView.as_view()),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view()),
    path("password-reset/verify-code/", PasswordResetVerifyCodeView.as_view()),
]
