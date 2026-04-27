from .models import Listing, Category, ListingImage
from .serializers import ListingSerializer, CategorySerializer
from .permissions import IsOwnerOrReadOnly
from .filters import ListingFilter
from .firebase_storage import upload_image_to_firebase
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, permissions, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status


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


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def upload_listing_image(request, pk):
    try:
        listing = Listing.objects.get(pk=pk, seller=request.user)
    except Listing.DoesNotExist:
        return Response(
            {"detail": "Listing not found or you are not the seller."},
            status=status.HTTP_404_NOT_FOUND
        )

    if "image" not in request.FILES:
        return Response(
            {"detail": "No image file provided."},
            status=status.HTTP_400_BAD_REQUEST
        )

    image_file = request.FILES["image"]

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if image_file.content_type not in allowed_types:
        return Response(
            {"detail": "Only JPEG, PNG, and WebP images are allowed."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        image_url = upload_image_to_firebase(image_file)
        listing_image = ListingImage.objects.create(
            listing=listing,
            image_url=image_url
        )
        return Response(
            {"image_url": image_url, "id": listing_image.id},
            status=status.HTTP_201_CREATED
        )
    except Exception as e:
        return Response(
            {"detail": "Image upload failed. Please try again."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )