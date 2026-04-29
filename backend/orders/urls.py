from django.urls import path
from .views import (
    OrderListCreateView,
    OrderDetailView,
    PaymentListView,
    PaymentDetailView,
    create_payment_intent,
    confirm_payment,
    payment_webhook,
    accept_order,
    reject_order,
    cancel_order,
    complete_order,
)

urlpatterns = [
    path("", OrderListCreateView.as_view(), name="order-list-create"),
    path("<int:pk>/", OrderDetailView.as_view(), name="order-detail"),
    path("<int:pk>/accept/", accept_order, name="order-accept"),
    path("<int:pk>/reject/", reject_order, name="order-reject"),
    path("<int:pk>/cancel/", cancel_order, name="order-cancel"),
    path("<int:pk>/complete/", complete_order, name="order-complete"),
    path("payments/", PaymentListView.as_view(), name="payment-list"),
    path("payments/<int:pk>/", PaymentDetailView.as_view(), name="payment-detail"),
    path(
        "payments/create-intent/", create_payment_intent, name="payment-create-intent"
    ),
    path("payments/confirm/", confirm_payment, name="payment-confirm"),
    path("payments/webhook/", payment_webhook, name="payment-webhook"),
]
