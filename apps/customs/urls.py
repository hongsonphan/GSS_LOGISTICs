from django.urls import path
from .api_views import (
    CustomsDeclarationListCreateAPIView,
    CustomsDeclarationDetailAPIView,
    CustomsQuickActionAPIView,
    CustomsExportExcelAPIView
)

urlpatterns = [
    path('', CustomsDeclarationListCreateAPIView.as_view(), name='customs-declarations-root'),
    path('declarations/', CustomsDeclarationListCreateAPIView.as_view(), name='customs-declarations-list'),
    path('declarations/<int:pk>/', CustomsDeclarationDetailAPIView.as_view(), name='customs-declaration-detail'),
    path('declarations/<int:pk>/action/', CustomsQuickActionAPIView.as_view(), name='customs-quick-action'),
    path('declarations/export-excel/', CustomsExportExcelAPIView.as_view(), name='customs-export-excel'),
]
