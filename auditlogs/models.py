from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class AuditLog(models.Model):
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )

    action = models.CharField(max_length=100)
    target_model = models.CharField(max_length=100)
    target_id = models.CharField(max_length=100)

    before_data = models.JSONField(default=dict, blank=True)
    after_data = models.JSONField(default=dict, blank=True)

    description = models.TextField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp", "id"]
        indexes = [
            models.Index(fields=["target_model", "target_id"]),
            models.Index(fields=["action"]),
            models.Index(fields=["timestamp"]),
        ]

    def clean(self):
        if not self.action:
            raise ValidationError({"action": "Action is required."})
        if not self.target_model:
            raise ValidationError({"target_model": "Target model is required."})
        if not self.target_id:
            raise ValidationError({"target_id": "Target ID is required."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.action} - {self.target_model}#{self.target_id}"