from rest_framework import serializers
from .models import BlockedUser, Report


class BlockedUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlockedUser
        fields = ['id', 'blocker', 'blocked', 'created_at']
        read_only_fields = ['blocker', 'created_at']


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = [
            'id',
            'reporter',
            'reported_user',
            'reported_listing',
            'reported_message',
            'reason',
            'status',
            'created_at',
        ]
        read_only_fields = ['reporter', 'created_at']