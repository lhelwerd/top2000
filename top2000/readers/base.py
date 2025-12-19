"""
Base row-based data parser.
"""

import bisect
import logging
import tomllib
from abc import ABC, abstractmethod
from collections.abc import Callable, Iterator, MutableMapping, MutableSequence
from copy import deepcopy
from itertools import chain, product
from pathlib import Path
from typing import ClassVar, Literal, TypeVar, overload

from typing_extensions import override

from ..logging import LOGGER
from ..normalization import Normalizer

BaseT = TypeVar("BaseT", bound=type["Base"])

RowPath = list[str | int]
Key = tuple[str, str]
KeySet = dict[Key, Literal[True]]
RelevantKeys = dict[tuple[int, ...], Key]
Positions = dict[int, list[Key]]
RowElement = str | int | bool
Row = dict[str, RowElement]
Tracks = dict[Key, Row]
Artists = dict[str, list[int]]

ExtraPositions = MutableSequence[Row]
ExtraData = RowElement | ExtraPositions

Field = int | float | str | bool | RowPath
Fields = MutableMapping[str, Field | MutableMapping[str, Field]]
FieldMap = dict[str, str]


class FieldHolder(MutableMapping[float, Fields]):
    """
    Field-based settings for reading input files of different years and formats.
    """

    def __init__(self) -> None:
        with Path("fields.toml").open("rb") as fields_file:
            self._raw: dict[str, list[Fields] | MutableMapping[str, Field]] = (
                tomllib.load(fields_file)
            )
            self._fields: MutableMapping[float, Fields] = {}
            if isinstance(self._raw["years"], list):
                for year in self._raw["years"]:
                    if isinstance(year["year"], (int, float)):
                        self._fields[year["year"]] = deepcopy(year)

    @override
    def __getitem__(self, key: float) -> Fields:
        return self._fields[key]

    @override
    def __setitem__(self, key: float, value: Fields) -> None:
        self._fields[key] = deepcopy(value)

    @override
    def __delitem__(self, key: float) -> None:
        del self._fields[key]

    @override
    def __iter__(self) -> Iterator[float]:
        return iter(self._fields)

    @override
    def __len__(self) -> int:
        return len(self._fields)

    def update_year(self, year: float, fields: Fields | str) -> None:
        """
        Merge fields with existing fields for a year.
        """

        if year not in self._fields:
            self._fields[year] = {}

        if isinstance(fields, str):
            subfields = deepcopy(self._raw.get(fields, {}))
            if not isinstance(subfields, dict):
                subfields = {}
            fields = {fields: subfields}

        for key, existing in self._fields[year].items():
            if isinstance(existing, dict):
                subfield = fields.pop(key, {})
                assert isinstance(subfield, dict), f"{key} must be a dict"
                existing.update(subfield)

        self._fields[year].update(fields)

    def get_str_field(
        self, year: float, input_format: str | None, key: str, default: str = ""
    ) -> str:
        """
        Get a string field for a year and input format.
        """

        fields = self._fields.get(year, {})
        if input_format is not None:
            subfield = fields.get(input_format, {})
            assert isinstance(subfield, dict), f"{input_format} must be a dict"
            fields = subfield
        field = fields.get(key, default)
        assert isinstance(field, str), f"{key} must be a string"
        return field

    def get_int_field(
        self, year: float, input_format: str | None, key: str, default: int = 0
    ) -> int:
        """
        Get an integer field for a year and input format.
        """

        fields = self._fields.get(year, {})
        if input_format is not None:
            format_fields = fields.get(input_format, {})
            assert isinstance(format_fields, dict)
            fields = format_fields
        field = fields.get(key, default)
        assert isinstance(field, (int, float)), f"{key} must be an int or float"
        return int(field)

    def get_bool_field(
        self,
        year: float,
        input_format: str | None,
        key: str,
        default: bool = False,
    ) -> bool:
        """
        Get a boolean field for a year and input format.
        """

        fields = self._fields.get(year, {})
        if input_format is not None:
            format_fields = fields.get(input_format, {})
            assert isinstance(format_fields, dict)
            fields = format_fields
        field = fields.get(key, default)
        assert isinstance(field, bool), f"{key} must be a boolean"
        return field

    def get_path_field(
        self, year: float, input_format: str | None, key: str
    ) -> RowPath:
        """
        Get a list field that indicates a nested object path for a year.
        """

        fields = self._fields.get(year, {})
        if input_format is not None:
            format_fields = fields.get(input_format, {})
            assert isinstance(format_fields, dict)
            fields = format_fields
        field = fields.get(key, [])
        assert isinstance(field, list), f"{key} must be a list"
        return field


class Base(ABC):
    """
    Base file reader based on field information.
    """

    first_year: float = 1999
    has_multiple_years: bool = False

    expected_positions: int = 2000

    csv_name_format: str = "TOP-2000-{}.csv"
    json_name_format: str = "top2000-{}.json"

    _readers: ClassVar[dict[str, type["Base"]]] = {}

    @classmethod
    def register(cls, name: str) -> Callable[[BaseT], BaseT]:
        """
        Register an input format by its subfield name or argument name.
        """

        def decorator(subclass: BaseT) -> BaseT:
            cls._readers[name] = subclass
            return subclass

        return decorator

    @classmethod
    def get_reader(cls, name: str) -> type["Base"]:
        """
        Retrieve an input format reader class by its name.
        """

        return cls._readers[name]

    def __init__(
        self,
        year: float | None = None,
        is_current_year: bool = True,
        fields: FieldHolder | None = None,
    ) -> None:
        if fields is None:
            self._fields: FieldHolder = FieldHolder()
        else:
            self._fields = fields
        self._had_empty_fields: bool = fields is None

        self._is_current_year: bool = is_current_year
        if year is None:
            self._year: float = self.latest_year
        else:
            self._year = year

        self._positions: Positions = {}
        self._tracks: Tracks = {}
        self._artists: Artists = {}
        self._last_time: str | None = None
        self.reset()

        # Set year or use latest year, optionally update field holder
        self.year = self._year

    @property
    def year(self) -> float:
        """
        Retrieve the current year to retrieve data for.
        """

        return self._year

    @year.setter
    def year(self, year: float) -> None:
        """
        Update the year to retrieve data for or reset it to the latest year.
        """

        self._year = year

        # Add "current year" fields for this format if new fields were created
        if (
            self._had_empty_fields
            and self._is_current_year
            and self.input_format is not None
        ):
            self._fields.update_year(self._year, self.input_format)

        self.reset_year()

    @property
    @abstractmethod
    def input_format(self) -> str | None:
        """
        Retrieve the name of the input format as used in the fields settings.
        This is the default source for field information for this reader.
        Input format can also be `None` to default to primary fields.
        """

        raise NotImplementedError("Must be defined by subclasses")

    @property
    def years(self) -> list[float]:
        """
        Retrieve known years from field settings.
        """

        return list(self._fields.keys())

    @property
    def first_csv_year(self) -> float:
        """
        Retrieve the first year that has a CSV file with an overview of all
        previous years.
        """

        return min(self.years)

    @property
    def latest_year(self) -> float:
        """
        Retrieve the latest year from field settings.
        """

        return max(self.years)

    def _get_str_field(
        self,
        key: str,
        default: str = "",
        input_format: str | Literal[True] | None = True,
        year: float | None = None,
    ) -> str:
        if input_format is True:
            input_format = self.input_format
        if year is None:
            year = self._year
        return self._fields.get_str_field(year, input_format, key, default)

    def _get_int_field(
        self,
        key: str,
        default: int = 0,
        input_format: str | Literal[True] | None = True,
        year: float | None = None,
    ) -> int:
        if input_format is True:
            input_format = self.input_format
        if year is None:
            year = self._year
        return self._fields.get_int_field(year, input_format, key, default)

    def _get_path_field(
        self,
        key: str,
        input_format: str | Literal[True] | None = True,
        year: float | None = None,
    ) -> RowPath:
        if input_format is True:
            input_format = self.input_format
        if year is None:
            year = self._year
        return self._fields.get_path_field(year, input_format, key)

    @abstractmethod
    def read(self) -> None:
        """
        Read relevant file(s).
        """

        raise NotImplementedError("Must be implemented by subclasses")

    def reset(self) -> None:
        """
        Reset current file parsing state.
        """

        self._positions = {}
        self._tracks = {}
        self._artists = {}
        self._last_time = None

    def reset_year(self) -> None:
        """
        Reset file parsing state after an update of the year.
        """

        self.reset()

    @property
    def positions(self) -> Positions:
        """
        Retrieve parsed position data which maps position numbers to artist and
        track keys.
        """

        return self._positions

    @property
    def tracks(self) -> Tracks:
        """
        Retrieve parsed track data which maps artist and track keys to fields.
        Multiple keys could refer to the same track through alternative keys.
        """

        return self._tracks

    @property
    def artists(self) -> Artists:
        """
        Retrieve parsed artist chart data which maps artist keys to lists of
        position numbers.
        """

        return self._artists

    @property
    def extra_data(self) -> dict[str, ExtraData]:
        """
        Retrieve additional data parsed by this reader which would not be suited
        for addition to the other position, tracks or artists fields.
        """

        return {}

    @property
    def credits(self) -> Row:
        """
        Retrieve information about the source of the data, including the name
        of the source, the publisher, source URL and terms of use.
        """

        return {}

    def _read_row(
        self, row: Row, fields: FieldMap, offset: int = 0
    ) -> tuple[Key | None, int | None]:
        """
        Read data extracted from a CSV row or JSON array element.
        """

        if self._is_current_year:
            self._check_album_version(row, fields["title"])
            self._check_timestamp(row, fields.get("timestamp"))

        pos_field = fields.get("pos", "position")
        position = (
            int(row[pos_field]) + offset
            if pos_field in row and int(row[pos_field]) + offset > 0
            else None
        )
        if position is not None and not self._is_current_year:
            row[str(int(self._year))] = position

        self._clear_previous_years(row, fields)

        best_key, keys, rejected_keys = self._update_keys(position, row, fields)
        LOGGER.track(
            best_key[0],
            ("george michael & queen", "somebody to love (live)"),
            self._year,
            keys,
            rejected_keys,
        )
        for key in keys:
            if self._tracks[key].get("best") is not True:
                self._tracks[key]["best"] = best_key[0]
                self._tracks[key]["best_title"] = best_key[1]

        LOGGER.track(
            str(row[fields["title"]]),
            "Zombie",
            self._year,
            best_key,
            keys,
            rejected_keys,
            position,
        )
        if position is not None and not self._is_current_year:
            self._tracks[best_key][str(int(self._year))] = position

        year_field = fields.get("year", "year")
        if year_field in row:
            self._tracks[best_key]["jaar"] = row[year_field]

        self._set_position_keys(position, best_key, keys, rejected_keys, fields)
        return best_key, position

    def _clear_previous_years(self, row: Row, fields: FieldMap) -> None:
        if not self._is_current_year:
            prv_field = fields.get("prv", "prv")
            pos_field = fields.get("pos", "position")
            if (
                str(int(self._year)) in pos_field
                and self._year != self.first_csv_year
            ):
                for year in range(int(self.first_year), int(self._year)):
                    _ = row.pop(str(year), None)
            _ = row.pop(prv_field, None)

    def _check_album_version(self, row: Row, title_field: str) -> None:
        # Album version indicator
        # For older years, this is removed in the title alternatives
        title = str(row[title_field])
        new_title = Normalizer.get_instance().check_album_version(title)
        if title != new_title:
            row["album_version"] = True
            row[title_field] = new_title

    def _check_timestamp(self, row: Row, time_field: str | None) -> None:
        if time_field is not None and time_field in row:
            row["timestamp"] = row[time_field]
            self._last_time = None
        elif self._last_time is not None:
            row["timestamp"] = self._last_time
            self._last_time = None

    def _update_keys(
        self, position: int | None, row: Row, fields: FieldMap
    ) -> tuple[Key, KeySet, KeySet]:
        normalizer = Normalizer.get_instance()
        orig_artist = str(row[fields["artist"]])
        orig_title = str(row[fields["title"]])
        artist_alternatives = normalizer.find_artist_alternatives(orig_artist)
        title_alternatives = normalizer.find_title_alternatives(orig_title)

        best_key, keys, rejected_keys = self._find_keys(
            row, fields, artist_alternatives, title_alternatives
        )

        if self._is_current_year and position in self._positions:
            new_row = row
            row = self._tracks[self._positions[position][0]].copy()
            row.update(new_row)
            keys.update(dict.fromkeys(self._positions[position], True))

        best_key, reinstate = self._update_best_key(
            best_key, row, artist_alternatives, title_alternatives, fields
        )
        if reinstate:
            keys.update(rejected_keys)
            rejected_keys = {}

        _ = keys.pop(best_key, None)
        return best_key, keys, rejected_keys

    def _find_keys(
        self,
        row: Row,
        fields: FieldMap,
        artist_alternatives: list[str],
        title_alternatives: list[str],
    ) -> tuple[Key, KeySet, KeySet]:
        best_key: Key | None = None
        key: Key = (artist_alternatives[-1], title_alternatives[-1])

        keys: KeySet = {}
        rejected_keys: KeySet = {}
        for artist, title in product(artist_alternatives, title_alternatives):
            key = (artist.lower().strip(), title.lower().strip())
            # Ignore alternative-pairs which we have seen this year.
            # This can happen because the keys are case-insensitive.
            if key in keys or key in rejected_keys:
                continue

            best_key, valid = self._update_row(
                key, row, fields=fields, best_key=best_key
            )
            if valid:
                keys[key] = True
            else:
                rejected_keys[key] = True

        if best_key is None:
            best_key = key  # original artist/title combination

        return best_key, keys, rejected_keys

    @overload
    def _update_row(
        self,
        key: Key,
        row: Row,
        fields: FieldMap | None = None,
        best_key: Key = ...,
    ) -> tuple[Key, bool]: ...

    @overload
    def _update_row(
        self,
        key: Key,
        row: Row,
        fields: FieldMap | None = None,
        best_key: Key | None = None,
    ) -> tuple[Key | None, bool]: ...

    def _update_row(
        self,
        key: Key,
        row: Row,
        fields: FieldMap | None = None,
        best_key: Key | None = None,
    ) -> tuple[Key | None, bool]:
        """
        Update data for a track.
        """

        if fields is None:
            fields = {}
        pos_field = fields.get("pos", "position")

        if key not in self._tracks:
            LOGGER.track(
                "danny vera/roller coaster",
                "/".join(key),
                key,
                best_key,
                row,
                self._year,
                level=logging.INFO,
            )
            self._tracks[key] = row.copy()
            return best_key, True

        new_row = row.copy()
        LOGGER.track(
            "queen/somebody to love",
            "/".join(key),
            key,
            best_key,
            self._tracks[key],
            row,
        )
        if self._check_collision(key, pos_field):
            LOGGER.debug(
                "Potential collision (%d: %r %r %r %r",
                self._year,
                key,
                best_key,
                row,
                self._tracks[key],
            )

            if (
                pos_field in self._tracks[key]
                and self._is_current_year
                and self._tracks[key][pos_field] == row.get(pos_field)
            ):
                return best_key, False

            if best_key == key or (
                best_key is None
                and "best" in self._tracks[key]
                and self._tracks[key]["best"] is not True
            ):
                LOGGER.track(
                    "danny vera",
                    str(row[fields.get("artist", "artiest")]).lower(),
                    "Collision",
                    self._year,
                    key,
                    best_key,
                    row,
                    self._tracks[key],
                    level=logging.INFO,
                )
                self._tracks[key] = new_row

            return best_key, False

        new_row.update(self._tracks[key])
        if "best" in new_row:
            best_key = (
                key
                if new_row["best"] is True
                else (str(new_row["best"]), str(new_row["best_title"]))
            )

        self._tracks[key] = new_row
        return best_key, True

    def _check_collision(self, key: Key, pos_field: str | None) -> bool:
        """
        Check if a track already has data for the current year.
        """

        track = self._tracks[key]
        if self._is_current_year:
            return pos_field is not None and pos_field in track
        return str(int(self._year)) in track

    def _update_best_key(
        self,
        best_key: Key,
        row: Row,
        artist_alternatives: list[str],
        title_alternatives: list[str],
        fields: FieldMap,
    ) -> tuple[Key, bool]:
        update_fields = {
            "artist": fields.get("artist", "artiest"),
            "titel": fields.get("title", "titel"),
        }
        LOGGER.track(
            "iron butterfly",
            artist_alternatives[-1].lower(),
            self._year,
            artist_alternatives,
            title_alternatives,
            best_key,
            row[update_fields["artist"]],
        )
        old_current_year = self._is_current_year
        self._is_current_year = True
        best_key = self._update_row(
            best_key, row, fields=update_fields, best_key=best_key
        )[0]
        self._is_current_year = old_current_year
        if self._is_current_year:
            # Collision was detected, possibly update the merged row
            # Update to best combination for current year
            self._tracks[best_key]["artiest"] = artist_alternatives[-1]
            self._tracks[best_key]["titel"] = title_alternatives[-1]
            LOGGER.track(
                "Comptine",
                str(self._tracks[best_key]["titel"]),
                title_alternatives,
                self._tracks[best_key],
            )

        return best_key, False

    def _set_position_keys(
        self,
        position: int | None,
        best_key: Key,
        keys: KeySet,
        rejected_keys: KeySet,
        fields: FieldMap,
    ) -> None:
        # Now we handle row[pos_field] and finalize best keys in the data
        self._set_accepted_keys(
            position,
            [best_key]
            + [
                key
                for key in keys
                if best_key[0].startswith(key[0])
                or not any(
                    rejected_key[0].startswith(key[0])
                    for rejected_key in rejected_keys
                )
            ],
            rejected_keys,
        )
        if position is not None and self._is_current_year:
            self._tracks[best_key]["best"] = True
            for key in chain([best_key], keys, rejected_keys):
                _ = self._artists.setdefault(key[0], [])
                LOGGER.track(
                    "Mary J",
                    str(
                        self._tracks[best_key][fields.get("artist", "artiest")]
                    ),
                    position,
                    key,
                    self._artists[key[0]],
                )
                if position not in self._artists[key[0]]:
                    bisect.insort(self._artists[key[0]], position)

    def _set_accepted_keys(
        self, position: int | None, keys: list[Key], rejected_keys: KeySet
    ) -> None:
        if position is not None:
            LOGGER.track(
                "don't let the sun go down on me",
                keys[0][0],
                keys,
                rejected_keys,
            )
            self._positions[position] = keys

    def select_relevant_keys(
        self,
        relevant_keys: RelevantKeys,
        position: int,
        keys: list[Key],
        primary: "Base | None" = None,
    ) -> None:
        """
        Update a dictionary of artist charts to artist keys with most relevant
        keys to describe the artists.
        """

        if primary is None:
            primary = self

        one: Key | None = None
        for key in keys:
            one = self._select_relevant_key(key, relevant_keys, primary, one)
        if one is not None:
            chart = (position,)
            relevant_keys[chart] = one
        elif not relevant_keys:
            # Always have some relevant key, so take best key
            best_key = keys[0]
            if best_key[0] in primary.artists:
                relevant_keys[tuple(primary.artists[best_key[0]])] = best_key

    def _select_relevant_key(
        self,
        key: Key,
        relevant_keys: RelevantKeys,
        primary: "Base",
        one: Key | None,
    ) -> Key | None:
        if key[0] in primary.artists:
            chart = tuple(primary.artists[key[0]])
            LOGGER.track(
                key[0], ("gotye", "kimbra"), key, chart, one, relevant_keys
            )
            if len(chart) == 1:
                normalizer = Normalizer.get_instance()
                if one is None and not normalizer.find_artist_splits(key[0])[1]:
                    one = key
            elif chart not in relevant_keys:
                relevant_keys[chart] = key

        return one
