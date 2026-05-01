"""
Reporting-related signal handlers.

Triggers trust score recalculation when reports change.
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from .models import Report
from users.services import recalculate_trust_score


@receiver(post_save, sender=Report)
def update_trust_score_on_report_save(sender, instance, **kwargs):
    if instance.reported_user_id:
        recalculate_trust_score(instance.reported_user)


@receiver(post_delete, sender=Report)
def update_trust_score_on_report_delete(sender, instance, **kwargs):
    if instance.reported_user_id:
        recalculate_trust_score(instance.reported_user)
