from django.contrib import admin
from .models import BlockedUser, Report

admin.site.register(BlockedUser)
admin.site.register(Report)
