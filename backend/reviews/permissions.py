"""
Review permission rules.

Controls who can create or access review records.
"""

from rest_framework.permissions import BasePermission


class CanCreateReview(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Not used here but placeholder if needed later
        return True
