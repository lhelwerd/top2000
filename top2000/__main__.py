"""
Parse lists of song tracks in the NPO Radio 2 Top 2000 from various years.
"""

from collections import deque
import sys
from .output.base import Format
from .readers.base import Base as ReaderBase
from .readers.multi import Years, OldFiles

def _parse_first_args(argv: deque[str]) \
        -> tuple[list[str], list[type[ReaderBase]], list[type[Format]], float]:
    latest_year: float = 2023
    readers: list[type[ReaderBase]] = []
    outputs: list[type[Format]] = []
    parsed_first = False
    try:
        while argv:
            readers.append(ReaderBase.get_reader(argv[0]))
            argv.popleft()
            parsed_first = True
    except KeyError:
        pass
    if not readers:
        readers.append(ReaderBase.get_reader("multi"))

    try:
        while argv:
            outputs.append(Format.get_format(argv[0]))
            argv.popleft()
            parsed_first = True
    except KeyError:
        pass
    if not outputs:
        outputs.append(Format.get_format("csv"))

    if argv:
        try:
            latest_year = float(argv[0])
            argv.popleft()
            parsed_first = True
        except ValueError:
            if not parsed_first:
                raise

    return list(argv), readers, outputs, latest_year

def main(argv: list[str]) -> int:
    """
    Main entry point.
    """

    try:
        argv, inputs, outputs, latest_year = _parse_first_args(deque(argv))
    except ValueError:
        print('Usage: python -m top2000 [inputs...] [outputs...] [latest_year]',
              file=sys.stderr)
        print('                         [current_csv] [current_json]',
              file=sys.stderr)
        print('                         [old_year] [old_csv] [old_json] ...',
              file=sys.stderr)
        return 0

    readers: list[ReaderBase] = []
    for inputter in inputs:
        reader = inputter(latest_year)
        if isinstance(reader, Years):
            current_csv, current_json = reader.format_filenames(*argv[0:2])
            old_years: set[float] = set(range(int(reader.first_csv_year),
                                              int(latest_year)))
            old_years.update(reader.years)
            old_years.discard(latest_year)
            old: OldFiles = tuple(zip((float(year) for year in argv[2::3]),
                                      argv[3::3], argv[4::3])) \
                if len(argv) > 4 \
                else tuple((year, *reader.format_filenames(year=year))
                           for year in sorted(old_years))

            reader.read_files(current_year_csv=current_csv,
                              current_year_json=current_json, old=old)
        else:
            reader.read()

        readers.append(reader)

    for output in outputs:
        formatter = output(ReaderBase.first_year, latest_year)
        for output_format in formatter.output_names:
            if not formatter.output_file(readers, output_format):
                return 1

    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
