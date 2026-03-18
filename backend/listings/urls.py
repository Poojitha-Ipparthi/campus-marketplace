from django.urls import path
from .views import ListingListCreateView, ListingDetailView

urlpatterns = [
    path('', ListingListCreateView.as_view(), name='listing-list-create'),
    path('<int:pk>/', ListingDetailView.as_view(), name='listing-detail'),
]