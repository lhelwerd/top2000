"""
JSON dump output.
"""

import json
from pathlib import Path
from .base import Format
from ..readers.base import Base as ReaderBase

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

        tracks = []
        positions = []
        for position, keys in self._sort_positions(data.positions, reverse):
            self._check_position(position, reverse)
            track = data.tracks[keys[0]]
            track["keys"] = keys
            tracks.append(track)
            positions.append(position)

        with path.open("w", encoding="utf-8") as json_file:
            json.dump({
                "tracks": tracks,
                "positions": positions,
                "artists": data.artists
            }, json_file)

        return True
