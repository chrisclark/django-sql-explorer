from django.forms import BooleanField, CharField, ModelForm, ValidationError
from django.forms.widgets import CheckboxInput, Select

from explorer.app_settings import EXPLORER_CONNECTIONS, EXPLORER_DEFAULT_CONNECTION
from explorer.models import MSG_FAILED_BLACKLIST, Query


class SqlField(CharField):

    def validate(self, value):
        """
        Ensure that the SQL passes the blacklist.

        :param value: The SQL for this Query model.
        """
        super().validate(value)
        query = Query(sql=value)

        passes_blacklist, failing_words = query.passes_blacklist()

        error = MSG_FAILED_BLACKLIST % ", ".join(
            failing_words) if not passes_blacklist else None

        if error:
            raise ValidationError(
                error,
                code="InvalidSql"
            )


class QueryForm(ModelForm):
    sql = SqlField()
    snapshot = BooleanField(widget=CheckboxInput, required=False)
    connection = CharField(widget=Select, required=False)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["connection"].widget.choices = self.connections
        if not self.instance.connection:
            self.initial["connection"] = EXPLORER_DEFAULT_CONNECTION
        self.fields["connection"].widget.attrs["class"] = "form-select"

    def clean(self):
        if self.instance and self.data.get("created_by_user", None):
            self.cleaned_data["created_by_user"] = \
                self.instance.created_by_user
        return super().clean()

    @property
    def created_by_user_email(self):
        user = self.instance.created_by_user
        if user:
            try:
                return user.email
            except AttributeError:
                pass

        return "--"

    @property
    def created_at_time(self):
        return self.instance.created_at.strftime("%Y-%m-%d")

    @property
    def connections(self):
        return [(v, k) for k, v in EXPLORER_CONNECTIONS.items()]

    class Meta:
        model = Query
        fields = ["title", "sql", "description", "snapshot", "connection"]
