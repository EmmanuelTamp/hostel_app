from django.contrib import admin
from .models import Booking, AccessCode, VerificationLog

admin.site.register(Booking)
admin.site.register(AccessCode)
admin.site.register(VerificationLog)