"""
Parse lists of song tracks in the NPO Radio 2 Top 2000 from various years.
"""

import sys
from .output import CSV
from .readers.multi import Years, OldFiles

def main(argv: list[str]) -> int:
    """
    Main entry point.
    """

    first_year = 1999
    first_csv_year = 2014 # Contains all the previous years
    try:
        current_year = float(argv[0]) if len(argv) > 0 else 2023
    except ValueError:
        print('Usage: python -m top2000 [year] [csv] [json]', file=sys.stderr)
        print('       [overview_csv] [overview_json] [overview_year] ...',
              file=sys.stderr)
        return 0

    years = Years(current_year)

    current_year_csv, current_year_json = years.format_filenames(*argv[1:3])
    old_years: set[float] = set(range(first_csv_year, int(current_year)))
    old_years.update(years.years)
    old_years.discard(current_year)
    old: OldFiles = tuple(zip(argv[3::3], argv[4::3],
                    (int(year) for year in argv[5::3]))) if len(argv) > 5 else \
        tuple((*years.format_filenames(year=year), year)
              for year in sorted(old_years))

    years.read_files(current_year_csv=current_year_csv,
                     current_year_json=current_year_json, old=old)

    formatter = CSV(first_year, current_year)
    for output_format in formatter.output_names:
        success = formatter.output_file(years, output_format)
        if not success:
            return 1

    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
