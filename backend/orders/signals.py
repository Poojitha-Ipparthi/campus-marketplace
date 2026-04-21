from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Order
from users.services import recalculate_trust_score


@receiver(post_save, sender=Order)
def update_trust_score_on_order_save(sender, instance, **kwargs):
    recalculate_trust_score(instance.buyer)
    recalculate_trust_score(instance.listing.seller)