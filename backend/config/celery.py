"""
Celery configuration for Campus Marketplace.

This module sets up the Celery task queue, which handles:
- Automatic reservation expiration (releases stuck RESERVED listings)
- Any future background tasks

To run Celery locally, open a new terminal in the backend folder with venv activated:
    celery -A backend worker --loglevel=info
    celery -A backend beat --loglevel=info
"""
import os
from celery import Celery

# Use Django settings for Celery
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("config")

# Load config from Django settings with CELERY_ prefix
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks from all installed Django apps
app.autodiscover_tasks()
