from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsBuyerOrSellerForRead(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return request.user == obj.buyer or request.user == obj.listing.seller
        return request.user == obj.buyer or request.user == obj.listing.seller