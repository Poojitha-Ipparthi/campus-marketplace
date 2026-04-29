"""
Campus Marketplace backend package.

This file ensures Celery is loaded when Django starts,
so the @shared_task decorator works correctly across all apps.
"""
from .celery import app as celery_app

__all__ = ("celery_app",)
