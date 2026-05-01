"""
User service functions.

Contains reusable business logic such as trust score recalculation.
"""

from decimal import Decimal, ROUND_HALF_UP
from django.db.models import Avg, Count, Q

from orders.models import Order
from reviews.models import Review


def clamp_decimal(value: Decimal, minimum: Decimal, maximum: Decimal) -> Decimal:
    # Keep value within allowed range
    if value < minimum:
        return minimum
    if value > maximum:
        return maximum
    return value


def round_score(value: Decimal) -> Decimal:
    # Round score to two decimal places
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def recalculate_trust_score(user):
    # Calculate average rating from reviews received
    review_stats = Review.objects.filter(reviewee=user).aggregate(
        avg_rating=Avg("rating"),
        total_reviews=Count("id"),
    )

    avg_rating = review_stats["avg_rating"]
    total_reviews = review_stats["total_reviews"] or 0

    # Default to 0 if user has no reviews
    if avg_rating is None:
        review_score = Decimal("0.00")
    else:
        review_score = Decimal(str(avg_rating))

    # Count completed transactions as buyer or seller
    completed_transactions = (
        Order.objects.filter(
            Q(buyer=user) | Q(listing__seller=user),
            status=Order.Status.COMPLETED,
        )
        .distinct()
        .count()
    )

    # Add small bonus for completed transactions, capped at 0.50
    transaction_bonus = Decimal("0.10") * Decimal(completed_transactions)
    transaction_bonus = min(transaction_bonus, Decimal("0.50"))

    # Users without reviews only receive transaction bonus
    if total_reviews == 0:
        score = transaction_bonus
    else:
        score = review_score + transaction_bonus

    # Keep final score between 0 and 5
    score = clamp_decimal(score, Decimal("0.00"), Decimal("5.00"))
    score = round_score(score)

    # Save updated trust score
    user.trust_score = score
    user.save(update_fields=["trust_score"])

    return score
