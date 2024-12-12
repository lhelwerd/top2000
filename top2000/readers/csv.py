"""
NPO Radio 2 Top 2000 CSV reader.
"""

import csv
from pathlib import Path
from .base import Base, Positions, Tracks, Artists

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

    def read_file(self, csv_path: Path, positions: Positions | None = None,
                  tracks: Tracks | None = None,
                  artists: Artists | None = None) -> None:
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
            "year": self._get_str_field("year", "jaar")
        }
        offset = self._get_int_field("offset", 0)
        with csv_path.open('r', encoding=encoding) as csv_file:
            reader = csv.DictReader(csv_file)
            for row in reader:
                self._read_row(row, fields, offset=offset)
