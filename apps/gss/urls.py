from django.urls import path

from apps.gss import api

urlpatterns = [
    # B/L: danh sách cont, phân bổ theo cont, tờ khai, free time, lệnh điều vận, phiếu giao hàng, chứng từ
    path('api/gss/bookings/<int:pk>/containers/', api.BookingContainersAPI.as_view()),
    path('api/gss/bookings/<int:pk>/containers/assign/', api.AssignContainersAPI.as_view()),
    path('api/gss/bookings/<int:pk>/allocation-template/', api.AllocationTemplateAPI.as_view()),
    path('api/gss/bookings/<int:pk>/allocation-import/', api.AllocationImportAPI.as_view()),
    path('api/gss/bookings/<int:pk>/allocation-import/commit/', api.AllocationImportCommitAPI.as_view()),
    path('api/gss/bookings/<int:pk>/overview/', api.BookingOverviewAPI.as_view()),
    path('api/gss/bookings/<int:pk>/apply-free-time/', api.ApplyFreeTimeAPI.as_view()),
    path('api/gss/bookings/<int:pk>/customs/', api.CustomsRefsAPI.as_view()),
    path('api/gss/bookings/<int:pk>/dispatch-order/', api.DispatchOrderPrintAPI.as_view()),
    path('api/gss/bookings/<int:pk>/delivery-notes/', api.DeliveryNotesAPI.as_view()),
    path('api/gss/bookings/<int:pk>/doc-tree/', api.BookingDocumentsAPI.as_view()),
    path('api/gss/containers/<int:pk>/', api.ContainerDetailAPI.as_view()),
    path('api/gss/customs/<int:pk>/', api.CustomsRefDetailAPI.as_view()),
    path('api/gss/delivery-notes/<int:pk>/', api.DeliveryNoteDetailAPI.as_view()),
    path('api/gss/free-time-rules/', api.FreeTimeRulesAPI.as_view()),
    path('api/gss/free-time-rules/<int:pk>/', api.FreeTimeRuleDetailAPI.as_view()),
    path('api/gss/lookup/', api.LookupAPI.as_view()),
    # Biểu giá
    path('api/gss/charge-codes/', api.ChargeCodesAPI.as_view()),
    path('api/gss/charge-codes/<int:pk>/', api.ChargeCodeDetailAPI.as_view()),
    path('api/gss/rate-cards/', api.RateCardsAPI.as_view()),
    path('api/gss/rate-cards/<int:pk>/', api.RateCardDetailAPI.as_view()),
    path('api/gss/rate-cards/<int:pk>/lines/', api.RateLinesAPI.as_view()),
    path('api/gss/rate-cards/<int:pk>/<str:action>/', api.RateCardActionAPI.as_view()),
    path('api/gss/rate-lines/<int:pk>/', api.RateLineDetailAPI.as_view()),
    # Chuyến: Trip Card, dòng giá, street-turn, khai chi hộ
    path('api/gss/trips/<str:code>/card/', api.TripCardAPI.as_view()),
    path('api/gss/trips/<str:code>/charges/', api.TripChargesAPI.as_view()),
    path('api/gss/trips/<str:code>/apply-rates/', api.TripApplyRatesAPI.as_view()),
    path('api/gss/trips/<str:code>/street-turn/', api.TripStreetTurnAPI.as_view()),
    path('api/gss/trips/<str:code>/legs/', api.TripLegsAPI.as_view()),
    path('api/gss/trips/<str:code>/claims/', api.TripClaimsAPI.as_view()),
    path('api/gss/job-lines/<int:pk>/', api.JobLineDetailAPI.as_view()),
    # Kế toán: chi hộ, hoá đơn, bảng kê
    path('api/gss/claims/', api.ClaimsAPI.as_view()),
    path('api/gss/claims/<int:pk>/review/', api.ClaimReviewAPI.as_view()),
    path('api/gss/claims/<int:pk>/invoice/', api.ClaimInvoiceAPI.as_view()),
    path('api/gss/invoices/', api.InvoicesAPI.as_view()),
    path('api/gss/invoices/parse-qr/', api.ParseQrAPI.as_view()),
    path('api/gss/invoices/<int:pk>/<str:action>/', api.InvoiceActionAPI.as_view()),
    path('api/gss/statements/', api.StatementsAPI.as_view()),
    path('api/gss/statements/candidates/', api.StatementCandidatesAPI.as_view()),
    path('api/gss/statements/<int:pk>/', api.StatementDetailAPI.as_view()),
    path('api/gss/statements/<int:pk>/<str:action>/', api.StatementActionAPI.as_view()),
]
