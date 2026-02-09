#!/usr/bin/env python3
import sys
import sqlite3
import pandas as pd
from pathlib import Path
import binascii


def is_binary_16(series: pd.Series) -> bool:
    """
    컬럼이 16바이트 바이너리인지 판단
    """
    non_null = series.dropna()
    if non_null.empty:
        return False

    for x in non_null:
        print(x)
        if len(x) != 36:
            return False
        if x[8] != '-':
            return False
        if x[13] != '-':
            return False
        if x[18] != '-':
            return False
        if x[23] != '-':
            return False
    return True

def infer_sqlite_type(series: pd.Series) -> str:
    """pandas dtype을 SQLite 타입으로 변환"""
    if pd.api.types.is_integer_dtype(series):
        return "INTEGER"
    if pd.api.types.is_float_dtype(series):
        return "REAL"
    if pd.api.types.is_bool_dtype(series):
        return "INTEGER"
    if is_binary_16(series):
        return "BLOB"
    return "TEXT"


def csv_to_sqlite(csv_path: str, db_path: str, table_name: str = None, pk: str = None):
    csv_path = Path(csv_path)
    db_path = Path(db_path)

    if not csv_path.exists():
        raise FileNotFoundError(f"CSV file not found: {csv_path}")

    if table_name is None:
        table_name = csv_path.stem

    print(f"Loading CSV: {csv_path}")
    df = pd.read_csv(csv_path)

    if df.empty:
        raise ValueError("CSV is empty.")

    print(f"Rows: {len(df)}")
    print(f"Columns: {list(df.columns)}")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 기존 테이블 제거
    sql = f'DROP TABLE IF EXISTS "{table_name}"'
    print(sql)
    cursor.execute(sql)

    # 스키마 생성
    columns_sql = []
    for col in df.columns:
        col_type = infer_sqlite_type(df[col])
        col_def = f'"{col}" {col_type}'
        if pk and col == pk:
            col_def += " PRIMARY KEY"
        columns_sql.append(col_def)

    create_sql = f'CREATE TABLE "{table_name}" ({", ".join(columns_sql)});'
    print(create_sql)
    print("Creating table...")
    cursor.execute(create_sql)

    # 데이터 삽입
    placeholders = ", ".join(["?"] * len(df.columns))
    insert_sql = f'INSERT INTO "{table_name}" VALUES ({placeholders})'

    print(insert_sql)
    print("Inserting rows...")
    cursor.executemany(insert_sql, df.itertuples(index=False, name=None))

    conn.commit()
    conn.close()

    print(f"Done. SQLite DB created at: {db_path}")


if __name__ == "__main__":

    csv_file = r'..\source\words.csv'
    db_file = r'..\work\word.db'
    table = 'words'
    primary_key = 'id'

    csv_to_sqlite(csv_file, db_file, table, primary_key)
