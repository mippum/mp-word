#!/usr/bin/env python3
import sys
import sqlite3
import pandas as pd
from pathlib import Path
import os

def blob_to_hex_if_needed(df: pd.DataFrame, conn, table_name: str):
    """
    BLOB 컬럼을 hex 문자열로 변환 (Git diff 친화적)
    """
    cursor = conn.cursor()
    cursor.execute(f'PRAGMA table_info("{table_name}")')
    columns_info = cursor.fetchall()

    for col in columns_info:
        col_name = col[1]
        col_type = (col[2] or "").upper()

        if "BLOB" in col_type:
            df[col_name] = df[col_name].apply(
                lambda x: x.hex() if isinstance(x, (bytes, bytearray)) else x
            )

    return df


def db_to_csv(
    db_path: str,
    table_name: str,
    output_csv: str,
    order_by: str = None,
    null_as_empty: bool = False,
):
    db_path = Path(db_path)
    output_csv = Path(output_csv)

    if not db_path.exists():
        raise FileNotFoundError(f"Database not found: {db_path}")

    conn = sqlite3.connect(db_path)

    # ORDER BY 기본값 (권장: PK 또는 id)
    order_clause = ""
    if order_by:
        order_clause = f" ORDER BY {order_by}"

    query = f'SELECT * FROM "{table_name}"{order_clause};'
    print("Executing:", query)

    df = pd.read_sql_query(query, conn)

    # BLOB → hex 문자열 변환
    df = blob_to_hex_if_needed(df, conn, table_name)

    # NULL 처리
    if null_as_empty:
        df = df.fillna("")

    # UTF-8 / LF 고정
    df.to_csv(
        output_csv,
        index=False,
        encoding="utf-8",
        lineterminator="\n",
    )

    conn.close()
    print(f"CSV written to: {output_csv}")


if __name__ == "__main__":
    pass

    # db_to_csv(os.path.join('..', 'work', 'word.db'),
    #           'words',
    #           os.path.join('..', 'source', 'words.csv'),
    #           'id')
    #
    # db_to_csv(os.path.join('..', 'work', 'word.db'),
    #           'en_long_meanings',
    #           os.path.join('..', 'source', 'en_long_meanings.csv'),
    #           'id')
    #
    # db_to_csv(os.path.join('..', 'work', 'word.db'),
    #           'sentences',
    #           os.path.join('..', 'source', 'sentences.csv'),
    #           'id')
    #
    # db_to_csv(os.path.join('..', 'work', 'word.db'),
    #           'simple_definitions',
    #           os.path.join('..', 'source', 'simple_definitions.csv'),
    #           'id')
    #
    # db_to_csv(os.path.join('..', 'work', 'word.db'),
    #           'word_mpfpm',
    #           os.path.join('..', 'source', 'word_mpfpm.csv'),
    #           'id')

    # db_to_csv(os.path.join('..', 'work', 'word.db'),
    #           'pronunciations',
    #           os.path.join('..', 'source', 'pronunciations.csv'),
    #           'id')

    # db_to_csv(os.path.join('..', 'work', 'word.db'),
    #           'word_by_books',
    #           os.path.join('..', 'source', 'word_by_books.csv'),
    #           'id')
