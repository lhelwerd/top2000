"""
JSON dump output.
"""

from itertools import zip_longest
import json
from pathlib import Path
from .base import Format, KeyPair
from ..readers.base import Base as ReaderBase, Key, Row, RowElement

FieldMap = dict[str, str]

@Format.register("json")
class JSON(Format):
    """
    JSON file with all details.
    """

    def output_file(self, readers: list[ReaderBase], output_format: str,
                    path: Path | None = None) -> bool:
        if not readers:
            return False
        if path is None:
            path = Path(f"output-{output_format}.json")

        reverse = self._get_bool_setting(output_format, "reverse")
        self.reset()

        self._sort_readers(readers)

        track_keys: list[list[Key]] = []
        tracks = []
        positions: list[int] = []
        reader_fields, numeric_fields = self._build_fields(readers,
                                                           output_format)

        for reader_keys in zip_longest(*(self._sort_positions(reader.positions,
                                                              reverse)
                                         for reader in readers)):
            self._check_positions(reader_keys, reverse)
            tracks.append(self._aggregate_track(readers, reader_keys,
                                                reader_fields, numeric_fields))
            positions.append(reader_keys[0][0])
            track_keys.append(reader_keys[0][1])

        data = {
            "tracks": tracks,
            "positions": positions,
            "keys": track_keys,
            "artists": readers[0].artists,
            "first_year": self._first_year,
            "year": self._current_year,
            "reverse": reverse
        }
        for reader in readers:
            data.update(reader.extra_data)
        with path.open("w", encoding="utf-8") as json_file:
            json.dump(data, json_file)

        return True

    def _sort_readers(self, readers: list[ReaderBase]) -> None:
        try:
            # First first reader without its own input format
            primary = next(index for index, reader in enumerate(readers)
                           if reader.input_format is None)
            readers[0], readers[primary] = readers[primary], readers[0]
        except StopIteration:
            # Assume first reader is primary and use it twice
            readers.insert(0, readers[0])

    def _check_positions(self, reader_keys: tuple[KeyPair | None, ...],
                         reverse: bool) -> None:
        last_position = self._last_position
        next_position: int | None = None
        for pair in reader_keys:
            if pair is not None:
                self._check_position(pair[0], reverse)
                self._last_position = last_position
                next_position = pair[0]

        self._last_position = next_position

    def _build_fields(self, readers: list[ReaderBase],
                      output_format: str) -> tuple[list[FieldMap], set[str]]:
        reader_fields = [self._get_dict_setting(output_format,
                                                "fields" if index == 0 or
                                                reader.input_format is None
                                                else reader.input_format)
                         for index, reader in enumerate(readers)]
        reader_fields[0].update({
            str(year): str(year)
            for year in range(self._first_year, self._current_year)
        })
        numeric_fields = {"year"}
        numeric_fields.update({
            str(year) for year in range(self._first_year, self._current_year)
        })
        return reader_fields, numeric_fields

    def _aggregate_track(self, readers: list[ReaderBase],
                         reader_keys: tuple[KeyPair | None, ...],
                         reader_fields: list[FieldMap],
                         numeric_fields: set[str]) \
            -> dict[str, RowElement | Row]:
        track: dict[str, RowElement | Row] = {}
        primary = True
        for reader, pair, fields in zip(readers, reader_keys, reader_fields):
            if pair is None:
                continue

            position, keys = pair
            subtrack = self._filter_track(reader, keys, fields,
                                          numeric_fields)
            if primary:
                track.update(subtrack)
                max_artist_key = self._find_artist_chart(position, keys,
                                                         reader.artists)
                if max_artist_key is not None:
                    track["max_artist_key"] = max_artist_key
            elif reader.input_format is not None:
                track[reader.input_format] = subtrack

            primary = False

        return track

    @staticmethod
    def _filter_track(reader: ReaderBase, keys: list[Key],
                      fields: FieldMap, numeric_fields: set[str]) -> Row:
        track = reader.tracks[keys[0]]
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

        return track
