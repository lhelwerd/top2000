"""
Multiple file reader.
"""

from pathlib import Path

from .base import Artists, Base, Positions, Row
from .csv import CSV
from .json import JSON

OldFiles = tuple[tuple[float, str, str], ...]


@Base.register("multi")
class Years(Base):
    """
    Read CSV and JSON files describing NPO Radio Top 2000 charts from multiple
    different years in order to obtain track metadata and positions.
    """

    has_multiple_years = True

    @property
    def input_format(self) -> str | None:
        return None

    def reset(self) -> None:
        super().reset()
        self._year_positions: dict[float, Positions] = {}
        self._year_artists: dict[float, Artists] = {}
        self.reset_year()

    def reset_year(self) -> None:
        self._positions = self._year_positions.setdefault(self._year, {})
        self._artists = self._year_artists.setdefault(self._year, {})

    def format_filenames(
        self,
        csv_name_format: str | None = None,
        json_name_format: str | None = None,
        *,
        year: float | None = None,
    ) -> tuple[str, str]:
        """
        Format CSV and JSON filenames for a particular year.
        """

        if year is None:
            year = self._year

        if csv_name_format is None:
            csv_name_format = self._fields.get_str_field(
                year, "csv", "name", self.csv_name_format
            )
        csv_name = csv_name_format.format(int(year))

        if json_name_format is None:
            json_name_format = self._fields.get_str_field(
                year, "json", "name", self.json_name_format
            )

        json_name = json_name_format.format(int(year))

        return csv_name, json_name

    def read(self) -> None:
        csv_name, json_name = self.format_filenames()
        self.read_files(csv_name, json_name)

    def read_files(
        self,
        current_year_csv: str | None = None,
        current_year_json: str | None = None,
        old: OldFiles | None = None,
    ) -> None:
        """
        Read JSON and/or CSV files for the current year as well as older years.
        """

        self.reset()

        # Read current year
        if current_year_json is not None and current_year_json != "":
            json = JSON(self._year, fields=self._fields)
            json.read_file(
                Path(current_year_json), tracks=self._tracks, artists=self._artists
            )
            self._positions = self._year_positions[self._year] = json.positions
            self._artists = self._year_artists[self._year] = json.artists
        if current_year_csv is not None and current_year_csv != "":
            csv = CSV(self._year, fields=self._fields)
            csv.read_file(
                Path(current_year_csv),
                positions=self._positions,
                tracks=self._tracks,
                artists=self._artists,
            )
            self._positions = self._year_positions[self._year] = csv.positions
            self._artists = self._year_artists[self._year] = csv.artists

        if old is not None:
            self._read_old_files(old)

    def _read_old_files(self, old: OldFiles) -> None:
        """
        Read files from earlier years, potentially with multiple year data
        in them.
        """

        for year, overview_csv_name, overview_json_name in old:
            overview_json_path = Path(overview_json_name)
            skip_json = self._fields.get_bool_field(year, "json", "skip")
            if overview_json_path.exists() and not skip_json:
                json = JSON(year, is_current_year=False, fields=self._fields)
                if self._fields.get_bool_field(year, "json", "old"):
                    json.read_old_file(overview_json_path, tracks=self._tracks)
                else:
                    json.read_file(overview_json_path, tracks=self._tracks)
                self._year_positions[year] = json.positions
                self._year_artists[year] = json.artists
            else:
                # No JSON file, so instead use CSV (very old years)
                # These are overview CSV files with possibly multiple years
                # The current year position is stored in a "pos XXXX" field
                self._fields.update_year(year, {"csv": {"pos": f"pos {int(year)}"}})
                csv = CSV(year, is_current_year=False, fields=self._fields)
                csv.read_file(Path(overview_csv_name), tracks=self._tracks)
                self._year_positions[year] = csv.positions
                self._year_artists[year] = csv.artists

    @property
    def credits(self) -> Row:
        return {
            "name": "NPO Radio 2 Top 2000",
            "publisher": "NPO",
            "url": "https://www.nporadio2.nl/top2000",
            "terms": "https://npo.nl/overnpo/algemene-voorwaarden/algemene-voorwaarden-online",
        }
