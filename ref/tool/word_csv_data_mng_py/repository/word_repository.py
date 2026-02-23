import sqlite3
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

class WordRepository:

    db_path = Path(os.path.join(BASE_DIR, '..', 'work', 'word.db'))

    def __init__(self):
        self.conn = sqlite3.connect(self.db_path)

    def __del__(self):
        self.conn.close()

    def _fetch_one(self, sql):
        debug = False
        # debug = True

        cursor = self.conn.cursor()
        if debug:
            print(f"sql: {sql.strip()}")
        cursor.execute(sql)
        the_one = cursor.fetchone()
        if the_one is None:
            if debug:
                print("result: None")
            return None
        if debug:
            print(f"result: {the_one[0]}")
        return the_one[0]

    def read_word_id(self, word):
        return self._fetch_one(f"""
            SELECT id FROM words WHERE word = '{word}';
        """)

    def read_word_svg(self, word_id):
        return self._fetch_one(f"""SELECT svg FROM word_svgs WHERE word_id = '{word_id}';""")

    def read_simple_definition(self, word_id):
        return self._fetch_one(f"""
            SELECT definition FROM simple_definitions WHERE word_id = '{word_id}';
        """)

    def read_simple_definition_read_aloud(self, word_id):
        return self._fetch_one(f"""
            SELECT read_aloud FROM simple_definitions WHERE word_id = '{word_id}';
        """)

    def read_en_long_meaning(self, word_id: str):
        return self._fetch_one(f"""
            SELECT meaning FROM en_long_meanings WHERE word_id = '{word_id}';
        """)

    def read_sentence(self, word_id):
        return self._fetch_one(f"""
            SELECT sentence FROM sentences WHERE word_id = '{word_id}';
        """)

    def read_sentence_ko_translation(self, word_id):
        return self._fetch_one(f"""
            SELECT ko_translation FROM sentences WHERE word_id = '{word_id}';
        """)

    def read_pronunciation_us(self, word_id):
        return self._fetch_one(f"""
            SELECT pronunciation FROM pronunciations WHERE language='us' and word_id = '{word_id}';
        """)


    def read_pronunciation_gb(self, word_id):
        return self._fetch_one(f"""
            SELECT pronunciation FROM pronunciations WHERE language='gb' and word_id = '{word_id}';
        """)

    def read_repr_svg_id_by_word(self, word):
        return self._fetch_one(f"""
            SELECT id FROM word_svgs WHERE mode='repr' and word = '{word}';
        """)

    def update_svg(self, svg_id, svg):
        cursor = self.conn.cursor()
        sql = f"""
            UPDATE word_svgs SET svg = '{svg}' WHERE id = '{svg_id}';
        """
        # print(f"sql: {sql.strip()}")
        cursor.execute(sql)
        self.conn.commit()
        # print(f'{cursor.rowcount}')
        return

    def create_svg(self, svg_id, word_id, word, svg):
        cursor = self.conn.cursor()
        sql = f"""
            INSERT INTO word_svgs (id, word_id, word, mode, svg) VALUES
            ('{svg_id}', '{word_id}', '{word}', 'repr', '{svg}');
        """
        # print(f"sql: {sql.strip()}")
        cursor.execute(sql)
        self.conn.commit()
        # print(f'{cursor.rowcount}')
        return


if __name__ == '__main__':

    repo = WordRepository()
    word_id = repo.read_word_id('company')
    print(word_id)
    # word_id = '0199277e-fa96-7083-0eba-7b3bb5d716ea'
    # word_id = '0199277e-fa96-7083-0eba-7b3bb5d716e'
    svg = repo.read_word_svg(word_id)
    print(svg)



