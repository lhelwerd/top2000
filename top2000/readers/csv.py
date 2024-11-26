"""
NPO Radio 2 Top 2000 CSV reader.
"""

# pylint: disable=too-many-arguments

import csv
from .base import read_row

def read_csv_file(csv_path, data, year=None, positions=None, pos_field="pos",
                  artist_field="artiest", title_field="titel", offset=0,
                  encoding="utf-8"):
    """
    Read a CSV file with track position data.
    """

    if positions is None:
        positions = {}
    last_time = None
    with csv_path.open('r', encoding=encoding) as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            # Python 3.6 provides OrderedDict which is slower to process
            last_time = read_row(dict(row), data, positions, year, pos_field,
                                 artist_field, title_field, last_time=last_time,
                                 offset=offset)

    return positions
