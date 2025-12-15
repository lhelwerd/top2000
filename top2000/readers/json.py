"""
NPO Radio 2 Top 2000 JSON API file reader.
"""

import json
from pathlib import Path
from typing import TypeVar, cast, final

from typing_extensions import override

from .base import Artists, Base, Row, RowElement, Tracks

Rows = list[Row] | dict[str | int, "Rows"]
NestedRow = dict[str, Row | RowElement]
NestedRows = list[NestedRow] | dict[str | int, "NestedRow"]
RowT = TypeVar("RowT", Row, NestedRow)


@final
class JSON(Base):
    """
    Read JSON file describing a NPO Radio 2 Top 2000 chart from a year.
    """

    @property
    @override
    def input_format(self) -> str | None:
        return "json"

    @override
    def read(self) -> None:
        json_name_format = self._get_str_field("name", self.json_name_format)
        json_path = Path(json_name_format.format(int(self._year)))
        self.read_file(json_path)

    def _load_rows(self, json_path: Path, row_type: type[RowT]) -> list[RowT]:
        with json_path.open("r", encoding="utf-8") as json_file:
            rows: list[RowT] | dict[str | int, list[RowT]] = cast(
                list[RowT] | dict[str | int, list[RowT]], json.load(json_file)
            )
            for key_index in self._get_path_field("rows"):
                if not isinstance(rows, dict):
                    raise TypeError(f"Unable to follow path {key_index}")
                rows = cast(
                    list[RowT] | dict[str | int, list[RowT]], rows[key_index]
                )
            if not isinstance(rows, list):
                raise TypeError(
                    f"Expected list (row type: {row_type}), found {type(rows)}"
                )
            return rows

    def read_old_file(
        self,
        json_path: Path,
        tracks: Tracks | None = None,
        artists: Artists | None = None,
    ) -> None:
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
            "prv": self._get_str_field("prv", "lastPosition"),
        }

        rows = self._load_rows(json_path, Row)
        for row in rows:
            _ = self._read_row(row, fields)

    def read_file(
        self,
        json_path: Path,
        tracks: Tracks | None = None,
        artists: Artists | None = None,
    ) -> None:
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
            "pos": "pos",
            "artist": "artist",
            "title": "title",
            "prv": "prv",
            "timestamp": time_field,
        }

        rows = self._load_rows(json_path, NestedRow)
        for row in rows:
            new_row: Row = {}
            for key, value in row.items():
                if isinstance(value, (str, int, bool)):
                    new_row[key] = value
                elif key == "position":
                    new_row["pos"] = value[pos_field]
                    new_row["prv"] = value[prv_field]
                elif key == "track":
                    new_row["artist"] = value[artist_field]
                    new_row["title"] = value[title_field]

            _ = self._read_row(new_row, fields)
