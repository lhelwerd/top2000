"""
Compare JSON output files.
"""

import json
import sys
from itertools import zip_longest
from pathlib import Path
from typing import cast

from .output.json import JSON, Dump, Track


def _compare_fields(
    index: int, first: Track, second: Track, formatter: JSON
) -> int:
    fields, numeric_fields = formatter.build_fields("sorted")
    errors = 0
    for field in fields.values():
        if field not in first and field not in second:
            if field not in numeric_fields:
                errors += 1
                print(
                    f"Missing required field {field} in both tracks {first!r} "
                    + f"and {second!r} at index {index}",
                    file=sys.stderr,
                )
        elif field not in first:
            errors += 1
            print(
                f"Missing field {field} in track {first!r} while it is in "
                + f"{second!r} at index {index}",
                file=sys.stderr,
            )
        elif field not in second:
            errors += 1
            print(
                f"Field {field} exists in track {first!r} while it missing in "
                + f"{second!r} at index {index}",
                file=sys.stderr,
            )
        elif first[field] != second[field]:
            errors += 1
            print(
                f"Difference in field {field} for tracks {first!r}, {second!r} "
                + f"at index {index}: {first[field]} != {second[field]}",
                file=sys.stderr,
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
                errors += _compare_fields(
                    index, first_track, second_track, formatter
                )

    print(f"Detected {errors} errors")
    return errors


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
