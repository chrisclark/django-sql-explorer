from django.urls import path

from explorer.views import (
    CreateQueryView, DeleteQueryView, DownloadFromSqlView, DownloadQueryView, EmailCsvQueryView, ListQueryLogView,
    ListQueryView, PlayQueryView, QueryFavoritesView, QueryFavoriteView, QueryView, SchemaJsonView, SchemaView,
    StreamQueryView, format_sql,
)

from assistant.views import assistant_help

urlpatterns = [
    path(
        "<int:query_id>/", QueryView.as_view(), name="query_detail"
    ),
    path(
        "<int:query_id>/download", DownloadQueryView.as_view(),
        name="download_query"
    ),
    path(
        "<int:query_id>/stream", StreamQueryView.as_view(),
        name="stream_query"
    ),
    path("download", DownloadFromSqlView.as_view(), name="download_sql"),
    path(
        "<int:query_id>/email_csv", EmailCsvQueryView.as_view(),
        name="email_csv_query"
    ),
    path(
        "<int:pk>/delete", DeleteQueryView.as_view(), name="query_delete"
    ),
    path("new/", CreateQueryView.as_view(), name="query_create"),
    path("play/", PlayQueryView.as_view(), name="explorer_playground"),
    path(
        "schema/<path:connection>", SchemaView.as_view(),
        name="explorer_schema"
    ),
    path(
        "schema.json/<path:connection>", SchemaJsonView.as_view(),
        name="explorer_schema_json"
    ),
    path("logs/", ListQueryLogView.as_view(), name="explorer_logs"),
    path("format/", format_sql, name="format_sql"),
    path("favorites/", QueryFavoritesView.as_view(), name="query_favorites"),
    path("favorite/<int:query_id>", QueryFavoriteView.as_view(), name="query_favorite"),
    path("", ListQueryView.as_view(), name="explorer_index"),
    path("assistant/", assistant_help, name="assistant"),
]
