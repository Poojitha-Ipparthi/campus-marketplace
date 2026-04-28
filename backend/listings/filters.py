from django_filters import rest_framework as filters
from .models import Listing


class ListingFilter(filters.FilterSet):
    category = filters.NumberFilter(field_name="category_id")
    seller = filters.NumberFilter(field_name="seller_id")
    condition = filters.ChoiceFilter(choices=Listing.Condition.choices)
    status = filters.ChoiceFilter(choices=Listing.Status.choices)
    min_price = filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = filters.NumberFilter(field_name="price", lookup_expr="lte")

    class Meta:
        model = Listing
        fields = [
            "category",
            "seller",
            "condition",
            "status",
            "min_price",
            "max_price",
        ]
