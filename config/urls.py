from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("hostels.urls")),
    path("api/", include("bookings.urls")),
    path("api/", include("payments.urls")),
    path("api/", include("reviews.urls")),
    path("api/", include("accounts.urls")),
]