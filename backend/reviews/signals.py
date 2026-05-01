"""
Review-related signal handlers.

Updates seller trust scores when reviews change.
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from .models import Review
from users.services import recalculate_trust_score


@receiver(post_save, sender=Review)
def update_trust_score_on_review_save(sender, instance, **kwargs):
    recalculate_trust_score(instance.reviewee)


@receiver(post_delete, sender=Review)
def update_trust_score_on_review_delete(sender, instance, **kwargs):
    recalculate_trust_score(instance.reviewee)
