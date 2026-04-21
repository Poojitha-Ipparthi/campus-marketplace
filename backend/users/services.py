from decimal import Decimal, ROUND_HALF_UP
from django.db.models import Avg, Count, Q

from orders.models import Order
from reviews.models import Review
from reporting.models import Report


def clamp_decimal(value: Decimal, minimum: Decimal, maximum: Decimal) -> Decimal:
    if value < minimum:
        return minimum
    if value > maximum:
        return maximum
    return value


def round_score(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def recalculate_trust_score(user):
    # 1. Average rating received
    review_stats = Review.objects.filter(reviewee=user).aggregate(
        avg_rating=Avg("rating"),
        total_reviews=Count("id"),
    )

    avg_rating = review_stats["avg_rating"]
    if avg_rating is None:
        avg_rating = Decimal("0.00")
    else:
        avg_rating = Decimal(str(avg_rating))

    # 2. User's orders involvement
    # A user may be buyer or seller
    order_qs = Order.objects.filter(
        Q(buyer=user) | Q(listing__seller=user)
    ).distinct()

    total_orders = order_qs.count()
    completed_orders = order_qs.filter(status=Order.Status.COMPLETED).count()
    cancelled_orders = order_qs.filter(status=Order.Status.CANCELLED).count()

    # Completion bonus: +0.10 per 5 completed orders, capped at +0.50
    completion_steps = completed_orders // 5
    completion_bonus = Decimal("0.10") * Decimal(completion_steps)
    completion_bonus = min(completion_bonus, Decimal("0.50"))

    # Cancellation penalty: cancellation_rate * 1.5, capped at 1.50
    if total_orders > 0:
        cancellation_rate = Decimal(cancelled_orders) / Decimal(total_orders)
        cancellation_penalty = cancellation_rate * Decimal("1.50")
    else:
        cancellation_penalty = Decimal("0.00")

    cancellation_penalty = min(cancellation_penalty, Decimal("1.50"))

    # 3. Report penalty
    valid_report_count = Report.objects.filter(
        reported_user=user,
        status__in=[Report.Status.REVIEWED, Report.Status.RESOLVED],
    ).count()

    report_penalty = Decimal("0.20") * Decimal(valid_report_count)
    report_penalty = min(report_penalty, Decimal("1.00"))

    # Final score
    score = avg_rating + completion_bonus - cancellation_penalty - report_penalty
    score = clamp_decimal(score, Decimal("0.00"), Decimal("5.00"))
    score = round_score(score)

    user.trust_score = score
    user.save(update_fields=["trust_score"])

    return score