from django.urls import path

from . import views

urlpatterns = [
    path('accounts/', views.LedgerAccountsAPIView.as_view(), name='ledger-accounts'),
    path('trial-balance/', views.TrialBalanceAPIView.as_view(), name='ledger-trial-balance'),
    path('journal/', views.GeneralJournalAPIView.as_view(), name='ledger-journal'),
    path('accounts/<str:code>/ledger/', views.AccountLedgerAPIView.as_view(), name='ledger-account-ledger'),
]
