from django.db import DatabaseError

from explorer import app_settings
from explorer.charts import get_line_chart, get_pie_chart
from explorer.models import QueryFavorite


def query_viewmodel(request, query, title=None, form=None, message=None,
                    run_query=True, error=None,
                    rows=app_settings.EXPLORER_DEFAULT_ROWS):
    """

    :return: Returns the context required for a view
    :rtype: dict
    """
    res = None
    ql = None
    if run_query:
        try:
            res, ql = query.execute_with_logging(request.user)
        except DatabaseError as e:
            error = str(e)
    has_valid_results = not error and res and run_query

    fullscreen_params = request.GET.copy()
    if 'fullscreen' not in fullscreen_params:
        fullscreen_params.update({
            'fullscreen': 1
        })
    if 'rows' not in fullscreen_params:
        fullscreen_params.update({
            'rows': rows
        })
    if 'querylog_id' not in fullscreen_params and ql:
        fullscreen_params.update({
            'querylog_id': ql.id
        })

    user = request.user
    is_favorite = False
    if user.is_authenticated and query.pk:
        is_favorite = QueryFavorite.objects.filter(user=user, query=query).exists()

    ret = {
        'tasks_enabled': app_settings.ENABLE_TASKS,
        'params': query.available_params_w_labels(),
        'title': title,
        'shared': query.shared,
        'query': query,
        'form': form,
        'message': message,
        'error': error,
        'rows': rows,
        'data': res.data[:rows] if has_valid_results else None,
        'headers': res.headers if has_valid_results else None,
        'total_rows': len(res.data) if has_valid_results else None,
        'duration': res.duration if has_valid_results else None,
        'has_stats':
            len([h for h in res.headers if h.summary])
            if has_valid_results else False,
        'snapshots': query.snapshots if query.snapshot else [],
        'ql_id': ql.id if ql else None,
        'unsafe_rendering': app_settings.UNSAFE_RENDERING,
        'fullscreen_params': fullscreen_params.urlencode(),
        'charts_enabled': app_settings.EXPLORER_CHARTS_ENABLED,
        'pie_chart_svg': get_pie_chart(res, rows=rows) if app_settings.EXPLORER_CHARTS_ENABLED and has_valid_results else None,
        'line_chart_svg': get_line_chart(res, rows=rows) if app_settings.EXPLORER_CHARTS_ENABLED and has_valid_results else None,
        'is_favorite': is_favorite
    }
    return ret
