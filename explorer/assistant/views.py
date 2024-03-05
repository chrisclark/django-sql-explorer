from django.http import JsonResponse
from django.utils import timezone
import json

from explorer.models import PromptLog
from explorer.assistant.prompts import master_prompt
from explorer.assistant.utils import (
    do_req, extract_response, tables_from_schema_info,
    get_table_names_from_query, sample_rows_from_tables
)


def run_assistant(request_data, user):

    user_prompt = ''

    sql = None
    if request_data['include_current_query']:
        sql = request_data['sql']
        user_prompt += f"## Existing SQL ##\n\n{sql}\n\n"

    if request_data['include_relevant_tables']:
        table_struct = tables_from_schema_info(request_data['connection'],
                                               get_table_names_from_query(sql))
        user_prompt += f"## Table Structure ##\n\n{table_struct}\n\n"

    if request_data['include_results_sample']:
        results_sample = sample_rows_from_tables(request_data['connection'],
                                                 get_table_names_from_query(sql))
        user_prompt += f"## Sample Results ##\n\n{results_sample}\n\n"

    user_prompt += f"## User's Request to Assistant ##\n\n{request_data['assistant_request']}\n\n"

    prompt = master_prompt
    prompt['user'] = user_prompt

    start = timezone.now()
    pl = PromptLog(
        prompt=prompt,
        run_by_user=user,
        run_at=timezone.now(),
    )
    response_text = None
    try:
        resp = do_req(prompt)
        response_text = extract_response(resp)
        pl.response = response_text
    except Exception as e:
        pl.error = str(e)
    finally:
        stop = timezone.now()
        pl.duration = (stop - start).total_seconds()
        pl.save()
    return response_text


def assistant_help(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)

            resp = run_assistant(data, request.user)

            response_data = {
                'status': 'success',
                'message': resp
            }

            return JsonResponse(response_data)

        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON'}, status=400)

    else:
        return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)
