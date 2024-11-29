"""
Parse lists of song tracks in the NPO Radio 2 Top 2000 from various years.
"""

# pylint: disable=too-many-locals

from collections import OrderedDict
from pathlib import Path
import sys
from .output import output_file
from .readers.multi import read_files

def main(argv):
    """
    Main entry point.
    """

    first_year = 1999
    first_csv_year = 2014 # Contains all the previous years
    csv_name_format = "TOP-2000-{}.csv"
    json_name_format = "top2000-{}.json"
    # JSON fields
    fields = {
        2019: {
            "artist": "a",
            "title": "s",
            "pos": "pos",
            "prv": "prv",
            "old": True,
            "rows": lambda data: data["data"][0]
        },
        2020: {
            "artist": "a",
            "title": "s",
            "pos": "pos",
            "prv": "prv",
            "old": True,
            "rows": lambda data: data["data"][0]
        },
        2021: {
            # See read_old_json_file for the defaults
            "old": True,
            # CSV encoding
            "encoding": "windows-1252",
            # We didn't read JSON in 2021
            #"skip": True,
            "rows": lambda data: data["positions"]
        },
        2022: {
            # CSV encoding
            "encoding": "windows-1252",
            # See read_json_file for the defaults
            "rows": lambda data: data["positions"]
        },
        2023: {
            # See read_json_file for the defaults
            "rows": lambda data: data["positions"]
        },
        2023.5: {
            # CSV position offset (for De Extra 500 2023)
            "offset": 2000,
            "csv_name": "De-Extra-500-2023.csv",
            "json_name": "de-extra-500-van-2023-12-11.json",
            # See read_json_file for the defaults
            "rows": lambda data: data["positions"]
        }
    }
    try:
        current_year = float(argv[0]) if len(argv) > 0 else 2023
    except ValueError:
        print('Usage: python -m top2000 [year] [csv] [json]', file=sys.stderr)
        print('       [overview_csv] [overview_json] [overview_year] ...',
              file=sys.stderr)
        return 0

    current_fields = fields.get(current_year, {})
    current_year_csv = argv[1] if len(argv) > 1 else \
        current_fields.get("csv_name", csv_name_format).format(current_year)
    current_year_json = argv[2] if len(argv) > 2 else \
        current_fields.get("json_name", json_name_format).format(current_year)
    old_years = set(range(first_csv_year, int(current_year)))
    old_years.update(fields.keys())
    old_years.discard(current_year)
    old = tuple(zip(argv[3::3], argv[4::3],
                    (int(year) for year in argv[5::3]))) if len(argv) > 5 else [
        (fields.get(year, {}).get("csv_name", csv_name_format).format(year),
         fields.get(year, {}).get("json_name", json_name_format).format(year),
         year)
        for year in sorted(old_years)
    ]

    positions, data = read_files(fields, current_year,
                                 current_year_csv=current_year_csv,
                                 current_year_json=current_year_json,
                                 overviews=old)

    settings = {
        "double": {
            "columns_per_page": 2,
            "rows_per_page": 100,
        },
        "single": {
            "columns_per_page": 1,
            "rows_per_page": 80,
            "columns": OrderedDict([
                ("position", "nr."),
                ("artist", "artiest"),
                ("title", "titel"),
                ("timestamp", "tijd")
            ])
        }
    }

    for output_format, options in settings.items():
        success = output_file(positions, data, first_year, current_year,
                              path=Path(f"output-{output_format}.csv"),
                              **options)
        if not success:
            return 1

    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
