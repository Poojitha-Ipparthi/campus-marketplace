from decimal import Decimal, ROUND_HALF_UP
from django.db.models import Avg, Count, Q

from orders.models import Order
from reviews.models import Review


def clamp_decimal(value: Decimal, minimum: Decimal, maximum: Decimal) -> Decimal:
    if value < minimum:
        return minimum
    if value > maximum:
        return maximum
    return value


def round_score(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def recalculate_trust_score(user):
    # 1. Average review rating received
    review_stats = Review.objects.filter(reviewee=user).aggregate(
        avg_rating=Avg("rating"),
        total_reviews=Count("id"),
    )

    avg_rating = review_stats["avg_rating"]
    total_reviews = review_stats["total_reviews"] or 0

    if avg_rating is None:
        review_score = Decimal("0.00")
    else:
        review_score = Decimal(str(avg_rating))

    # 2. Completed transactions as buyer or seller
    completed_transactions = (
        Order.objects.filter(
            Q(buyer=user) | Q(listing__seller=user),
            status=Order.Status.COMPLETED,
        )
        .distinct()
        .count()
    )

    # +0.10 per completed transaction, capped at +0.50
    transaction_bonus = Decimal("0.10") * Decimal(completed_transactions)
    transaction_bonus = min(transaction_bonus, Decimal("0.50"))

    # If no reviews, score only reflects completed transaction bonus
    if total_reviews == 0:
        score = transaction_bonus
    else:
        score = review_score + transaction_bonus

    score = clamp_decimal(score, Decimal("0.00"), Decimal("5.00"))
    score = round_score(score)

    user.trust_score = score
    user.save(update_fields=["trust_score"])

    return score
