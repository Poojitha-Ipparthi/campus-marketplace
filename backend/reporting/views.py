"""
API views for reporting and blocking users.

Allows authenticated users to create reports and manage blocks.
"""

from django.db import IntegrityError
from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError

from .models import BlockedUser, Report
from .serializers import BlockedUserSerializer, ReportSerializer


class BlockUserView(generics.ListCreateAPIView):
    serializer_class = BlockedUserSerializer
    permission_classes = [permissions.IsAuthenticated]

    # Users can only view blocks they created
    def get_queryset(self):
        return BlockedUser.objects.filter(blocker=self.request.user)

    def perform_create(self, serializer):
        try:
            # Set blocker from authenticated user
            serializer.save(blocker=self.request.user)
        except IntegrityError:
            # Handle duplicate block attempts
            raise ValidationError({"blocked": "This user is already blocked."})


class UnblockUserView(generics.DestroyAPIView):
    serializer_class = BlockedUserSerializer
    permission_classes = [permissions.IsAuthenticated]

    # Users can only unblock users they blocked
    def get_queryset(self):
        return BlockedUser.objects.filter(blocker=self.request.user)


class ReportListCreateView(generics.ListCreateAPIView):
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    # Users can only view reports they submitted
    def get_queryset(self):
        return Report.objects.filter(reporter=self.request.user)

    def perform_create(self, serializer):
        try:
            # Set reporter from authenticated user
            serializer.save(reporter=self.request.user)
        except IntegrityError:
            # Handle database conflicts safely
            raise ValidationError(
                {"detail": "Report creation conflicted with existing data."}
            )


class ReportDetailView(generics.RetrieveAPIView):
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    # Users can only access their own reports
    def get_queryset(self):
        return Report.objects.filter(reporter=self.request.user)
