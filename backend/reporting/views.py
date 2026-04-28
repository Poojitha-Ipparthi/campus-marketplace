from django.db import IntegrityError
from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError

from .models import BlockedUser, Report
from .serializers import BlockedUserSerializer, ReportSerializer


class BlockUserView(generics.ListCreateAPIView):
    serializer_class = BlockedUserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return BlockedUser.objects.filter(blocker=self.request.user)

    def perform_create(self, serializer):
        try:
            serializer.save(blocker=self.request.user)
        except IntegrityError:
            raise ValidationError({"blocked": "This user is already blocked."})


class UnblockUserView(generics.DestroyAPIView):
    serializer_class = BlockedUserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return BlockedUser.objects.filter(blocker=self.request.user)


class ReportListCreateView(generics.ListCreateAPIView):
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Report.objects.filter(reporter=self.request.user)

    def perform_create(self, serializer):
        try:
            serializer.save(reporter=self.request.user)
        except IntegrityError:
            raise ValidationError(
                {"detail": "Report creation conflicted with existing data."}
            )


class ReportDetailView(generics.RetrieveAPIView):
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Report.objects.filter(reporter=self.request.user)
