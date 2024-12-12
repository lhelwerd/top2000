"""
NPO Radio 2 Top 2000 JSON API file reader.
"""

import json
from pathlib import Path
from .base import Base, Tracks, Artists

class JSON(Base):
    """
    Read JSON file describing a NPO Radio 2 Top 2000 chart from a year.
    """

    @property
    def input_format(self) -> str | None:
        return "json"

    def read(self) -> None:
        json_name_format = self._get_str_field("name", self.json_name_format)
        json_path = Path(json_name_format.format(int(self._year)))
        self.read_file(json_path)

    def read_old_file(self, json_path: Path, tracks: Tracks | None = None,
                      artists: Artists | None = None) -> None:
        """
        Read a JSON file with track position data in a legacy JSON API response
        with a flattened array of objects.
        """

        self.reset()
        if tracks is not None:
            self._tracks = tracks
        if artists is not None:
            self._artists = artists

        fields = {
            "pos": self._get_str_field("pos", "position"),
            "artist": self._get_str_field("artist", "artist"),
            "title": self._get_str_field("title", "title"),
            "year": self._get_str_field("year", "year"),
            "prv": self._get_str_field("prv", "lastPosition")
        }

        with json_path.open('r', encoding='utf-8') as json_file:
            rows = json.load(json_file)
            for key_index in self._get_path_field("rows"):
                rows = rows[key_index]
            for row in rows:
                self._read_row(row, fields)

    def read_file(self, json_path: Path, tracks: Tracks | None = None,
                  artists: Artists | None = None) -> None:
        """
        Read a JSON file with track position data in an array of objects with
        nested position and track data.
        """

        self.reset()
        if tracks is not None:
            self._tracks = tracks
        if artists is not None:
            self._artists = artists

        # In "position"
        pos_field = self._get_str_field("pos", "current")
        prv_field = self._get_str_field("prv", "previous")
        # In "track"
        artist_field = self._get_str_field("artist", "artist")
        title_field = self._get_str_field("title", "title")
        # In primary object
        time_field = self._get_str_field("time", "broadcastUnixTime")

        fields = {
            'pos': 'pos',
            'artist': 'artist',
            'title': 'title',
            'prv': 'prv',
            'timestamp': time_field
        }

        with json_path.open('r', encoding='utf-8') as json_file:
            rows = json.load(json_file)
            for key_index in self._get_path_field("rows"):
                rows = rows[key_index]
            for row in rows:
                row['pos'] = row['position'][pos_field]
                row['prv'] = row['position'][prv_field]
                row['artist'] = row['track'][artist_field]
                row['title'] = row['track'][title_field]
                self._read_row(row, fields)
