import logging
from explorer import app_settings
from explorer.schema import schema_info
from explorer.utils import get_valid_connection
from sql_metadata import Parser


if app_settings.EXPLORER_OPENAI_API_KEY:
    from openai import OpenAI

OPENAI_MODEL = app_settings.EXPLORER_ASSISTANT_MODEL
ROW_SAMPLE_SIZE = 2


def openai_client():
    return OpenAI(
        api_key=app_settings.EXPLORER_OPENAI_API_KEY,
        base_url="https://openrouter.ai/api/v1"
    )


def do_req(prompt, history=None):
    if not history:
        history = []
    messages = history + [
        {"role": "system", "content": prompt["system"]},
        {"role": "user", "content": prompt["user"]},
    ]
    resp = openai_client().chat.completions.create(
      model=OPENAI_MODEL,
      messages=messages
    )
    messages.append(resp.choices[0].message)
    logging.info(f"Response: {messages}")
    return messages


def extract_response(r):
    return r[-1].content


def tables_from_schema_info(connection, table_names):
    schema = schema_info(connection)
    return [table for table in schema if table[0] in table_names]


def sample_rows_from_tables(connection, table_names):
    ret = None
    for table_name in table_names:
        ret = f"SAMPLE FROM TABLE {table_name}:\n"
        ret = ret + format_rows_from_table(
            sample_rows_from_table(connection, table_name)
        ) + "\n\n"
    return ret


def sample_rows_from_table(connection, table_name):
    conn = get_valid_connection(connection)
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM {table_name} LIMIT {ROW_SAMPLE_SIZE}")
    ret = [[header[0] for header in cursor.description]]
    ret = ret + cursor.fetchall()
    return ret


def format_rows_from_table(rows):
    column_headers = list(rows[0])
    ret = " | ".join(column_headers) + "\n" + "-" * 50 + "\n"
    for row in rows[1:]:
        row_str = " | ".join(str(item) for item in row)
        ret += row_str + "\n"
    return ret


def get_table_names_from_query(sql):
    parsed = Parser(sql)
    return parsed.tables
