"""
JSON dump output.
"""

import json
from pathlib import Path
from .base import Format
from ..readers.base import Base as ReaderBase, Key

class JSON(Format):
    """
    JSON file with all details.
    """

    @property
    def format(self) -> str:
        return "json"

    def output_file(self, data: ReaderBase, output_format: str,
                    path: Path | None = None) -> bool:
        if path is None:
            path = Path(f"output-{output_format}.json")

        reverse = self._get_bool_setting(output_format, "reverse")
        self.reset()

        track_keys: list[list[Key]] = []
        tracks = []
        positions = []
        fields = self._get_dict_setting(output_format, "fields")
        numeric_fields = {"year"}
        fields.update({
            str(year): str(year)
            for year in range(self._first_year, self._current_year)
        })
        numeric_fields.update({
            str(year) for year in range(self._first_year, self._current_year)
        })

        for position, keys in self._sort_positions(data.positions, reverse):
            self._check_position(position, reverse)
            track = data.tracks[keys[0]]
            track = {
                field: track[key] for key, field in fields.items()
                if key in track
            }
            for field in numeric_fields:
                if field in track:
                    if track[field] in {"", "0", 0}:
                        track.pop(field)
                    else:
                        track[field] = int(track[field])

            track_keys.append(keys)
            tracks.append(track)
            positions.append(position)

        with path.open("w", encoding="utf-8") as json_file:
            json.dump({
                "tracks": tracks,
                "positions": positions,
                "keys": track_keys,
                "artists": data.artists,
                "year": self._current_year
            }, json_file)

        return True
