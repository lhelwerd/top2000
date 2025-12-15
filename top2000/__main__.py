"""
Parse lists of song tracks in the NPO Radio 2 Top 2000 from various years.
"""

import sys
from collections import deque
from itertools import zip_longest

from .output.base import Format
from .readers.base import Base as ReaderBase
from .readers.multi import OldFiles, Years


def _parse_first_args(
    argv: deque[str],
) -> tuple[list[str], list[type[ReaderBase]], list[type[Format]], float | None]:
    readers: list[type[ReaderBase]] = []
    outputs: list[type[Format]] = []
    latest_year: float | None = None
    parsed_first = False
    try:
        while argv:
            readers.append(ReaderBase.get_reader(argv[0]))
            _ = argv.popleft()
            parsed_first = True
    except KeyError:
        pass
    if not readers:
        readers.append(ReaderBase.get_reader("multi"))

    try:
        while argv:
            outputs.append(Format.get_format(argv[0]))
            _ = argv.popleft()
            parsed_first = True
    except KeyError:
        pass
    if not outputs:
        outputs.append(Format.get_format("csv"))

    if argv:
        try:
            latest_year = float(argv.popleft())
            parsed_first = True
        except ValueError:
            if not parsed_first:
                raise

    return list(argv), readers, outputs, latest_year


def _sort_year(old_year: float) -> float:
    if int(old_year) == old_year:
        return old_year
    # Sort "extra" years to be earlier than the year itself, so that they are
    # handled afterwards.
    return old_year - 1


def _parse_year_args(
    reader: Years, argv: list[str], current_year: float
) -> tuple[str, str, OldFiles]:
    current_year_csv, current_year_json = reader.format_filenames(*argv[0:2])
    try:
        if len(argv) > 4:
            # Triples of year, CSV filename, JSON filename
            old: OldFiles = tuple(
                zip(
                    (float(year) for year in argv[2::3]),
                    argv[3::3],
                    argv[4::3],
                    strict=True,
                )
            )
        elif len(argv) > 2:
            # Single year using formats from arguments or from fields
            csv_name_format = argv[0] if "{}" in argv[0] else None
            json_name_format = argv[1] if "{}" in argv[1] else None
            year = float(argv[2])
            old = (
                (
                    year,
                    *reader.format_filenames(
                        csv_name_format=csv_name_format,
                        json_name_format=json_name_format,
                        year=year,
                    ),
                ),
            )
        else:
            old_years: set[float] = set(
                range(int(reader.first_csv_year), int(current_year))
            )
            old_years.update(reader.years)
            old_years.discard(current_year)
            old = tuple(
                (year, *reader.format_filenames(year=year))
                for year in sorted(old_years, reverse=True, key=_sort_year)
            )
    except ValueError:
        # One of the first arguments in triples was not a year, skip them all
        old = ()

    return current_year_csv, current_year_json, old


def _select_year(
    current_year: float, latest_year: float | None, year: float | None
) -> float:
    if year is not None:
        return year
    if latest_year is not None:
        return latest_year
    return current_year


def _read_year(
    reader: ReaderBase | None,
    inputter: type[ReaderBase],
    current_year: float,
    latest_year: float | None,
    year: float | None,
    argv: list[str],
) -> tuple[float, float, bool, ReaderBase]:
    old_data_available = False
    if (
        reader is not None
        and reader.has_multiple_years
        and len(reader.positions) >= ReaderBase.expected_positions
    ):
        reader.year = current_year = _select_year(
            current_year, latest_year, year
        )
        new_latest_year = (
            latest_year if latest_year is not None else current_year
        )
        old_data_available = True
    else:
        reader = inputter(year=year)
        if latest_year is None:
            current_year = new_latest_year = reader.latest_year
            old_data_available = True
        else:
            current_year = _select_year(current_year, latest_year, year)
            new_latest_year = max(latest_year, reader.latest_year)

        if isinstance(reader, Years):
            reader.read_files(*_parse_year_args(reader, argv, current_year))
        else:
            reader.read()

    return current_year, new_latest_year, old_data_available, reader


def _write_year(
    outputs: list[type[Format]],
    readers: list[ReaderBase],
    current_year: float,
    latest_year: float | None,
    old_data_available: bool = False,
) -> bool:
    for output in outputs:
        formatter = output(
            ReaderBase.first_year,
            current_year,
            latest_year if latest_year is not None else current_year,
        )
        for output_format in formatter.output_names:
            print(f"Writing file format {output_format} year {current_year}")
            if not formatter.output_file(
                readers.copy(),
                output_format,
                old_data_available=old_data_available,
            ):
                return False

    return True


def main(argv: list[str]) -> int:
    """
    Main entry point.
    """

    try:
        argv, inputs, outputs, latest_year = _parse_first_args(deque(argv))
    except ValueError:
        print(
            "Usage: python -m top2000 [inputs...] [outputs...] [latest_year]",
            file=sys.stderr,
        )
        print(
            "                         [current_csv] [current_json]",
            file=sys.stderr,
        )
        print(
            "                         [old_year] [old_csv] [old_json] ...",
            file=sys.stderr,
        )
        return 0

    current_year = ReaderBase.first_year
    years = deque((latest_year,))
    old_data_available = False
    readers: list[ReaderBase] = []
    while years:
        year = years.popleft()

        for index, (reader, inputter) in enumerate(
            zip_longest(readers, inputs)
        ):
            current_year, latest_year, has_old_data, reader = _read_year(
                reader, inputter, current_year, latest_year, year, argv
            )
            old_data_available = old_data_available or has_old_data

            readers[index : index + 1] = [reader]

            previous_year = year - 1 if year is not None else current_year - 1
            if old_data_available and previous_year >= ReaderBase.first_year:
                years.append(previous_year)

        if not _write_year(
            outputs, readers, current_year, latest_year, old_data_available
        ):
            return 1

    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
