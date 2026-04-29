from django.db import IntegrityError
from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError
from .models import Review
from .permissions import CanCreateReview
from .serializers import ReviewSerializer


class ReviewListCreateView(generics.ListCreateAPIView):
    serializer_class = ReviewSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [CanCreateReview()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        """
        Filter reviews by order ID and/or reviewer.
        Supports ?order=<id> and ?reviewer=<id> query params.
        """
        queryset = Review.objects.all().order_by("-created_at")

        order_id = self.request.query_params.get("order")
        if order_id:
            queryset = queryset.filter(order_id=order_id)

        reviewer_id = self.request.query_params.get("reviewer")
        if reviewer_id:
            queryset = queryset.filter(reviewer_id=reviewer_id)

        reviewee_id = self.request.query_params.get("reviewee")
        if reviewee_id:
            queryset = queryset.filter(reviewee_id=reviewee_id)

        return queryset

    def perform_create(self, serializer):
        try:
            serializer.save(reviewer=self.request.user)
        except IntegrityError:
            raise ValidationError(
                {"detail": "You have already reviewed this order."}
            )


class ReviewDetailView(generics.RetrieveAPIView):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]
