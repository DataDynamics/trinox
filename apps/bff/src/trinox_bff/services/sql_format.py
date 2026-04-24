"""SQL formatting helpers (Trino dialect hints handled by sqlparse)."""

from __future__ import annotations

import sqlparse


def format_sql(
    sql: str,
    *,
    uppercase_keywords: bool = True,
    reindent: bool = True,
    indent_width: int = 2,
    strip_comments: bool = False,
) -> str:
    return sqlparse.format(
        sql,
        keyword_case="upper" if uppercase_keywords else "lower",
        reindent=reindent,
        indent_width=indent_width,
        strip_comments=strip_comments,
        use_space_around_operators=True,
    ).strip()
