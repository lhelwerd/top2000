"""
NPO Radio 2 Top 2000 CSV reader.
"""

import csv
from pathlib import Path

from .base import Artists, Base, FieldMap, Key, Positions, Row, Tracks


class CSV(Base):
    """
    Read CSV file describing NPO Radio 2 Top 2000 charts from one or more years.
    """

    @property
    def input_format(self) -> str | None:
        return "csv"

    def read(self) -> None:
        csv_name_format = self._get_str_field("name", self.csv_name_format)
        csv_path = Path(csv_name_format.format(int(self._year)))
        self.read_file(csv_path)

    def read_file(
        self,
        csv_path: Path,
        positions: Positions | None = None,
        tracks: Tracks | None = None,
        artists: Artists | None = None,
    ) -> None:
        """
        Read a CSV file with track position data.
        """

        self.reset()
        if positions is not None:
            self._positions = positions
        if tracks is not None:
            self._tracks = tracks
        if artists is not None:
            self._artists = artists

        encoding = self._get_str_field("encoding", "utf-8")
        fields = {
            "pos": self._get_str_field("pos", "positie"),
            "artist": self._get_str_field("artist", "artiest"),
            "title": self._get_str_field("title", "titel"),
            "year": self._get_str_field("year", "jaar"),
        }
        offset = self._get_int_field("offset", 0)
        with csv_path.open("r", encoding=encoding) as csv_file:
            reader = csv.DictReader(csv_file)
            for row in reader:
                self._read_row(row, fields, offset=offset)

    def _read_row(
        self, row: Row, fields: FieldMap, offset: int = 0
    ) -> tuple[Key | None, int | None, list[Key]]:
        pos_field = fields.get("pos", "position")
        if pos_field in row and row[pos_field] == "":
            # Date/time row, track last_time
            self._last_time = str(row[fields["title"]])
            return None, None, []
        if pos_field not in row and str(int(self._year)) in row:
            row[pos_field] = row[str(int(self._year))]

        return super()._read_row(row, fields, offset=offset)
