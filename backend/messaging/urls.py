from django.urls import path
from .views import MessageListCreateView, MessageDetailView, MarkMessageReadView

urlpatterns = [
    path('', MessageListCreateView.as_view(), name='message-list-create'),
    path('<int:pk>/', MessageDetailView.as_view(), name='message-detail'),
    path('<int:pk>/read/', MarkMessageReadView.as_view(), name='message-read'),
]