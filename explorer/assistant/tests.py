from explorer.tests.factories import SimpleQueryFactory
from unittest.mock import patch, Mock

from django.test import TestCase
from explorer.app_settings import EXPLORER_DEFAULT_CONNECTION as CONN


class TestAssistantViews(TestCase):

    @patch("explorer.assistant.utils.openai_client")
    def test_do_modify_query(self, mocked_openai_client):
        # create.return_value should match: resp.choices[0].message
        mocked_openai_client.return_value.chat.completions.create.return_value = Mock(
            choices=[Mock(message=Mock(content="smart computer"))])
        from explorer.assistant.views import run_assistant
        request_data = {
           "sql": "SELECT * FROM explorer_query",
           "connection": CONN,
           "assistant_request": "Test Request"
        }
        resp = run_assistant(request_data, None)
        self.assertEqual(resp, "smart computer")


class TestPromptContext(TestCase):

    def test_retrieves_sample_rows(self):
        from explorer.assistant.utils import sample_rows_from_table, ROW_SAMPLE_SIZE
        SimpleQueryFactory(title="First Query")
        SimpleQueryFactory(title="Second Query")
        SimpleQueryFactory(title="Third Query")
        SimpleQueryFactory(title="Fourth Query")
        ret = sample_rows_from_table(CONN, "explorer_query")
        self.assertEqual(len(ret), ROW_SAMPLE_SIZE+1)  # includes header row

    def test_format_rows_from_table(self):
        from explorer.assistant.utils import format_rows_from_table
        d = [
            ["col1", "col2"],
            ["val1", "val2"],
        ]
        ret = format_rows_from_table(d)
        self.assertEqual(ret, "col1 | col2\n" + "-" * 50 + "\nval1 | val2\n")

    def test_parsing_tables_from_query(self):
        from explorer.assistant.utils import get_table_names_from_query
        sql = "SELECT * FROM explorer_query"
        ret = get_table_names_from_query(sql)
        self.assertEqual(ret, ["explorer_query"])

    def test_schema_info_from_table_names(self):
        from explorer.assistant.utils import tables_from_schema_info
        ret = tables_from_schema_info(CONN, ["explorer_query"])
        expected = [("explorer_query", [
            ("id", "AutoField"),
            ("title", "CharField"),
            ("sql", "TextField"),
            ("description", "TextField"),
            ("created_at", "DateTimeField"),
            ("last_run_date", "DateTimeField"),
            ("created_by_user_id", "IntegerField"),
            ("snapshot", "BooleanField"),
            ("connection", "CharField")])]
        self.assertEqual(ret, expected)
