from django.db import models
from django.conf import settings


class PromptLog(models.Model):

    class Meta:
        app_label = "explorer"

    prompt = models.TextField(blank=True)
    response = models.TextField(blank=True)
    run_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE
    )
    run_at = models.DateTimeField(auto_now_add=True)
    duration = models.FloatField(blank=True, null=True)  # seconds
    model = models.CharField(blank=True, max_length=128, default="")
    error = models.TextField(blank=True, null=True)
