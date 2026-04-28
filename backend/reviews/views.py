from django.db import IntegrityError
from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError

from .models import Review
from .permissions import CanCreateReview
from .serializers import ReviewSerializer


class ReviewListCreateView(generics.ListCreateAPIView):
    queryset = Review.objects.all().order_by("-created_at")
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_permissions(self):
        if self.request.method == "POST":
            return [CanCreateReview()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        try:
            serializer.save(reviewer=self.request.user)
        except IntegrityError:
            raise ValidationError({"detail": "You have already reviewed this order."})


class ReviewDetailView(generics.RetrieveAPIView):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]
