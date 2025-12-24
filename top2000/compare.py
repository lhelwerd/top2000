"""
Compare JSON output files.
"""

import json
import sys
from itertools import zip_longest
from pathlib import Path
from typing import cast

from .normalization import Normalizer
from .output.json import JSON, Dump, Track
from .readers.base import Base as ReaderBase


def _compare_field(field: str, first_track: Track, second_track: Track) -> bool:
    normalizer = Normalizer.get_instance()
    match field, first_track.get(field), second_track.get(field):
        case "artist", str(first), str(second):
            return first.lower() == second.lower() or not set(
                normalizer.find_artist_alternatives(first)
            ).isdisjoint(normalizer.find_artist_alternatives(second))
        case "title", str(first), str(second):
            return first.lower() == second.lower() or not set(
                normalizer.find_title_alternatives(first)
            ).isdisjoint(normalizer.find_title_alternatives(second))
        case _, str(first), str(second):
            return first.lower() == second.lower()
        case _, int(first), int(second):
            return first == second
        case _, int(first), None if field.isnumeric():
            return first > ReaderBase.expected_positions
        case _, None, int(second) if field.isnumeric():
            return second > ReaderBase.expected_positions
        case _, first, second if first is not None and second is not None:
            return type(first) is type(second) and first == second

    return False


def _compare_fields(first: Track, second: Track, formatter: JSON) -> list[str]:
    ignored_fields = {"year", "timestamp", "album_version"}
    fields, numeric_fields = formatter.build_fields("sorted")
    errors: list[str] = []
    for field in fields.values():
        if field in ignored_fields:
            continue
        if field not in first and field not in second:
            if field not in numeric_fields:
                errors.append(f"Missing required field {field} in both tracks")
        elif not _compare_field(field, first, second):
            errors.append(
                f"Difference in field {field}: {first.get(field)} !="
                + f" {second.get(field)}"
            )

    return errors


def main(argv: list[str] | None = None) -> int:
    """
    Main entry point for JSON comparison.
    """

    if argv is None:
        argv = sys.argv[1:]

    if len(argv) < 1:
        print(
            "Usage: python3 -m top2000.compare <JSON> [JSON]", file=sys.stderr
        )
        print("Second JSON defaults to output-sorted.json", file=sys.stderr)
        return 0

    one = Path(argv[0])
    two = Path(argv[1] if len(argv) >= 2 else "output-sorted.json")
    errors = 0
    with (
        one.open("r", encoding="utf-8") as first_file,
        two.open("r", encoding="utf-8") as second_file,
    ):
        first = cast(Dump, json.load(first_file))
        second = cast(Dump, json.load(second_file))
        formatter = JSON(
            first["first_year"],
            first["year"],
            first.get("latest_year", first["year"]),
        )
        for index, (first_track, second_track) in enumerate(
            zip_longest(first["tracks"], second["tracks"])
        ):
            if first_track is None:
                print(f"Missing track in {one} at {index}", file=sys.stderr)
                errors += 1
            elif second_track is None:
                print(f"Missing track in {two} at {index}", file=sys.stderr)
                errors += 1
            else:
                track_errors = _compare_fields(
                    first_track, second_track, formatter
                )
                if track_errors:
                    print(
                        f"Differences between tracks {first_track!r} and "
                        + f"{second_track!r} at {index}:\n- ",
                        end="",
                        file=sys.stderr,
                    )
                    print("\n- ".join(track_errors), file=sys.stderr)
                    errors += len(track_errors)

    print(f"Detected {errors} errors")
    return errors


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
