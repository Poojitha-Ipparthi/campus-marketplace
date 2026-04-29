from django.core.cache import cache
from .models import Listing, Category, ListingImage
from .serializers import ListingSerializer, CategorySerializer
from .permissions import IsOwnerOrReadOnly
from .filters import ListingFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, permissions, filters, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from users.views import IsVerified

try:
    from .firebase_storage import upload_image_to_firebase
except Exception:
    upload_image_to_firebase = None



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
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = ListingFilter
    search_fields = ["title", "description"]
    ordering_fields = ["price", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return (
            Listing.objects.select_related("seller", "category")
            .prefetch_related("images")
            .order_by("-created_at")
        )

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsVerified()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)

        try:
            cache.delete("listings_all_ids")
        except Exception:
            pass


class ListingDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Listing.objects.select_related("seller", "category").prefetch_related(
        "images"
    )
    serializer_class = ListingSerializer
    permission_classes = [IsOwnerOrReadOnly]

    def perform_destroy(self, instance):
        from firebase_admin import storage
        for image in instance.images.all():
            try:
                bucket = storage.bucket()
                # Extract path from URL and delete from Firebase
                url = image.image_url
                if "firebasestorage" in url:
                    path = url.split("/o/")[1].split("?")[0]
                    import urllib.parse
                    path = urllib.parse.unquote(path)
                    blob = bucket.blob(path)
                    blob.delete()
            except Exception:
                pass
        cache.delete("listings_all")
        instance.delete()


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def upload_listing_image(request, pk):
    if upload_image_to_firebase is None:
        return Response(
            {"detail": "Image upload service is not configured."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    try:
        listing = Listing.objects.get(pk=pk, seller=request.user)
    except Listing.DoesNotExist:
        return Response(
            {"detail": "Listing not found or you are not the seller."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if "image" not in request.FILES:
        return Response(
            {"detail": "No image file provided."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    image_file = request.FILES["image"]

    allowed_types = ["image/jpeg", "image/png", "image/webp"]

    if image_file.content_type not in allowed_types:
        return Response(
            {"detail": "Only JPEG, PNG, and WebP images are allowed."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # 5MB file size limit
    if image_file.size > 5 * 1024 * 1024:
        return Response(
            {"detail": "Image size must be under 5MB."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        image_url = upload_image_to_firebase(image_file)

        listing_image = ListingImage.objects.create(
            listing=listing,
            image_url=image_url,
        )

        try:
            cache.delete("listings_all_ids")
        except Exception:
            pass

        return Response(
            {
                "image_url": image_url,
                "id": listing_image.id,
            },
            status=status.HTTP_201_CREATED,
        )

    except Exception:
        return Response(
            {"detail": "Image upload failed. Please try again."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

@api_view(["DELETE"])
@permission_classes([permissions.IsAuthenticated])
def delete_listing_image(request, pk, image_id):
    try:
        listing = Listing.objects.get(pk=pk, seller=request.user)
    except Listing.DoesNotExist:
        return Response(
            {"detail": "Listing not found or you are not the seller."},
            status=status.HTTP_404_NOT_FOUND,
        )

    try:
        image = ListingImage.objects.get(pk=image_id, listing=listing)
    except ListingImage.DoesNotExist:
        return Response(
            {"detail": "Image not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Delete from Firebase
    try:
        from firebase_admin import storage
        url = image.image_url
        if "firebasestorage" in url:
            path = url.split("/o/")[1].split("?")[0]
            import urllib.parse
            path = urllib.parse.unquote(path)
            bucket = storage.bucket()
            blob = bucket.blob(path)
            blob.delete()
    except Exception:
        pass  # Don't fail if Firebase delete fails

    image.delete()

    try:
        from django.core.cache import cache
        cache.delete("listings_all_ids")
        cache.delete("listings_all")
    except Exception:
        pass

    return Response({"detail": "Image deleted."}, status=status.HTTP_200_OK)
