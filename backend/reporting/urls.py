from django.urls import path
from .views import (
    BlockUserView,
    UnblockUserView,
    ReportListCreateView,
    ReportDetailView,
)

urlpatterns = [
    path("blocks/", BlockUserView.as_view(), name="block-list-create"),
    path("blocks/<int:pk>/", UnblockUserView.as_view(), name="block-delete"),
    path("reports/", ReportListCreateView.as_view(), name="report-list-create"),
    path("reports/<int:pk>/", ReportDetailView.as_view(), name="report-detail"),
]
