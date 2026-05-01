"""
Order permission rules.

Restricts order access to the buyer or the listing seller.
"""

from rest_framework.permissions import BasePermission


class IsBuyerOrSellerForRead(BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user == obj.buyer or request.user == obj.listing.seller
