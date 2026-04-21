from .models import Listing, Category
from .serializers import ListingSerializer, CategorySerializer
from .permissions import IsOwnerOrReadOnly
from .filters import ListingFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, permissions, filters


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]


class CategoryDetailView(generics.RetrieveAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]


class ListingListCreateView(generics.ListCreateAPIView):
    serializer_class = ListingSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ListingFilter
    search_fields = ["title", "description"]
    ordering_fields = ["price", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = (
            Listing.objects.select_related("seller", "category")
            .prefetch_related("images")
            .order_by("-created_at")
        )

        return queryset

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)


class ListingDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = (
        Listing.objects.select_related("seller", "category")
        .prefetch_related("images")
    )
    serializer_class = ListingSerializer
    permission_classes = [IsOwnerOrReadOnly]