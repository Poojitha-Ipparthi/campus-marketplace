from django.urls import path
from .views import (
    CategoryListView,
    CategoryDetailView,
    ListingListCreateView,
    ListingDetailView,
    upload_listing_image,
)

urlpatterns = [
    path("", ListingListCreateView.as_view(), name="listing-list-create"),
    path("<int:pk>/", ListingDetailView.as_view(), name="listing-detail"),
    path("<int:pk>/upload-image/", upload_listing_image, name="upload-listing-image"),
    path("categories/", CategoryListView.as_view(), name="category-list"),
    path("categories/<int:pk>/", CategoryDetailView.as_view(), name="category-detail"),
]
