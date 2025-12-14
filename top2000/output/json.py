"""
JSON dump output.
"""

import json
from itertools import zip_longest
from pathlib import Path
from typing import override

from ..logging import LOGGER
from ..readers.base import (
    Artists,
    ExtraData,
    Key,
    RelevantKeys,
    Row,
    RowElement,
)
from ..readers.base import Base as ReaderBase
from .base import Format, KeyPair

FieldMap = dict[str, str]

Track = dict[str, RowElement | Row]
Dump = dict[
    str,
    list[Track]
    | list[int]
    | list[list[Key]]
    | Artists
    | int
    | bool
    | dict[str, str]
    | ExtraData,
]


@Format.register("json")
class JSON(Format):
    """
    JSON file with all details.
    """

    @override
    def output_file(
        self,
        readers: list[ReaderBase],
        output_format: str,
        path: Path | None = None,
        old_data_available: bool = False,
    ) -> bool:
        if not readers:
            return False
        if path is None:
            path = self._generate_path(output_format)

        reverse = self._get_bool_setting(output_format, "reverse")
        relevant = self._get_bool_setting(output_format, "relevant")
        self.reset()

        self._sort_readers(readers)

        track_keys: list[list[Key]] = []
        tracks: list[Track] = []
        positions: list[int] = []
        reader_fields, numeric_fields = self._build_fields(
            readers, output_format
        )

        for reader_keys in zip_longest(
            *(
                self._sort_positions(reader.positions, reverse)
                for reader in readers
            )
        ):
            self._check_positions(reader_keys, reverse)
            tracks.append(
                self._aggregate_track(
                    readers, reader_keys, reader_fields, numeric_fields
                )
            )
            if reader_keys[0] is not None:
                positions.append(reader_keys[0][0])

            track_keys.append(self._select_keys(readers, reader_keys, relevant))

        data: Dump = {
            "tracks": tracks,
            "positions": positions,
            "keys": track_keys,
            "artists": self._select_artists(readers, track_keys, relevant),
            "first_year": self._first_year,
            "year": self._current_year,
            "latest_year": self._latest_year,
            "old_data_available": old_data_available,
            "reverse": reverse,
            "columns": self._get_dict_setting(output_format, "columns"),
        }
        data.update(self._select_extra_data(readers))

        with path.open("w", encoding="utf-8") as json_file:
            json.dump(data, json_file, separators=(",", ":"))

        return True

    def _generate_path(self, output_format: str) -> Path:
        name = (
            output_format
            if self._current_year == self._latest_year
            else self._current_year
        )
        return Path(f"output-{name}.json")

    def _sort_readers(self, readers: list[ReaderBase]) -> None:
        try:
            # First first reader without its own input format
            primary = next(
                index
                for index, reader in enumerate(readers)
                if reader.input_format is None
            )
            readers[0], readers[primary] = readers[primary], readers[0]
        except StopIteration:
            # Assume first reader is primary and use it twice for aggregation
            # into main track and subtracks
            readers.insert(0, readers[0])

    def _check_positions(
        self, reader_keys: tuple[KeyPair | None, ...], reverse: bool
    ) -> None:
        last_position = self._last_position
        next_position: int | None = None
        for pair in reader_keys:
            if pair is not None:
                self._check_position(pair[0], reverse)
                self._last_position = last_position
                next_position = pair[0]

        self._last_position = next_position

    def _build_fields(
        self, readers: list[ReaderBase], output_format: str
    ) -> tuple[list[FieldMap], set[str]]:
        reader_fields = [
            self._get_dict_setting(
                output_format,
                "fields"
                if index == 0 or reader.input_format is None
                else reader.input_format,
            )
            for index, reader in enumerate(readers)
        ]
        reader_fields[0].update({
            str(year): str(year)
            for year in range(self._first_year, self._current_year)
        })
        numeric_fields = {"year"}
        numeric_fields.update({
            str(year) for year in range(self._first_year, self._latest_year)
        })
        return reader_fields, numeric_fields

    def _aggregate_track(
        self,
        readers: list[ReaderBase],
        reader_keys: tuple[KeyPair | None, ...],
        reader_fields: list[FieldMap],
        numeric_fields: set[str],
    ) -> dict[str, RowElement | Row]:
        track: dict[str, RowElement | Row] = {}
        primary = True
        for reader, pair, fields in zip(
            readers, reader_keys, reader_fields, strict=True
        ):
            if pair is None:
                continue

            position, keys = pair
            subtrack = self._filter_track(reader, keys, fields, numeric_fields)
            if primary:
                track.update(subtrack)
                max_artist_key = self._find_artist_chart(
                    position, keys, reader.artists
                )
                if max_artist_key is not None:
                    track["max_artist_key"] = max_artist_key
            elif reader.input_format is not None:
                track[reader.input_format] = subtrack

            primary = False

        return track

    @staticmethod
    def _filter_track(
        reader: ReaderBase,
        keys: list[Key],
        fields: FieldMap,
        numeric_fields: set[str],
    ) -> Row:
        track = reader.tracks[keys[0]]
        LOGGER.track(
            str(track.get("title_link")),
            "Master Blaster (Jammin')",
            track,
            fields,
        )
        track = {
            field: track[key] for key, field in fields.items() if key in track
        }
        for field in numeric_fields:
            if field in track:
                if track[field] in {"", "0", 0}:
                    track.pop(field)
                else:
                    track[field] = int(track[field])

        return track

    def _select_keys(
        self,
        readers: list[ReaderBase],
        reader_keys: tuple[KeyPair | None, ...],
        relevant: bool = False,
    ) -> list[Key]:
        if not relevant:
            return reader_keys[0][1] if reader_keys[0] is not None else []
        relevant_keys: RelevantKeys = {}
        primary = True
        for reader, key_pair in zip(readers, reader_keys, strict=True):
            if reader is readers[0] and not primary:
                continue
            if key_pair is not None:
                reader.select_relevant_keys(
                    relevant_keys, key_pair[0], key_pair[1], primary=readers[0]
                )
            primary = False
        LOGGER.track(
            "bob marley",
            next(iter(relevant_keys.values()))[0],
            reader_keys,
            relevant_keys,
        )
        return list(relevant_keys.values())

    def _select_artists(
        self,
        readers: list[ReaderBase],
        track_keys: list[list[Key]],
        relevant: bool = False,
    ) -> Artists:
        artists: Artists = {}
        relevant_keys: set[str] = set()
        if relevant:
            for track in track_keys:
                relevant_keys.update(pair[0] for pair in track)
        for reader in set(readers):
            if not relevant:
                artists.update(reader.artists)
            else:
                artists.update({
                    artist: chart
                    for artist, chart in reader.artists.items()
                    if artist in relevant_keys
                })
        return artists

    def _select_extra_data(
        self, readers: list[ReaderBase]
    ) -> dict[str, ExtraData]:
        primary = True
        data: dict[str, ExtraData] = {}
        credits_data: list[Row] = []
        for reader in readers:
            if reader is readers[0] and not primary:
                continue

            data.update(reader.extra_data)
            if reader.credits:
                credits_data.append(reader.credits)
            primary = False

        data["credits"] = credits_data
        return data
