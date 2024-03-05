from django.conf import settings
from django.shortcuts import render

from explorer import app_settings


class ExplorerContextMixin:

    def gen_ctx(self):
        return {
            "can_view": app_settings.EXPLORER_PERMISSION_VIEW(
                self.request
            ),
            "can_change": app_settings.EXPLORER_PERMISSION_CHANGE(
                self.request
            ),
            "assistant_enabled": app_settings.EXPLORER_OPENAI_API_KEY is not None,
            "csrf_cookie_name": settings.CSRF_COOKIE_NAME,
            "csrf_cookie_httponly": settings.CSRF_COOKIE_HTTPONLY,
            "view_name": self.request.resolver_match.view_name,
        }

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx.update(self.gen_ctx())
        return ctx

    def render_template(self, template, ctx):
        ctx.update(self.gen_ctx())
        return render(self.request, template, ctx)
