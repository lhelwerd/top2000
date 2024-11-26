"""
Multiple file reader.
"""

from pathlib import Path
from .csv import read_csv_file
from .json import read_json_file, read_old_json_file

def read_files(fields, current_year, current_year_csv=None,
               current_year_json=None, overviews=None):
    """
    Read JSON and/or CSV files for the current year.
    """

    data = {"artists": {}, "tracks": {}}
    positions = {}
    # Read current year
    if current_year_json is not None and current_year_json != "":
        positions = read_json_file(Path(current_year_json), data,
                                   fields[current_year], year=None)
    if current_year_csv is not None and current_year_csv != "":
        positions = read_csv_file(Path(current_year_csv), data, year=None,
                                  positions=positions, pos_field="positie",
                                  offset=fields[current_year].get("offset", 0),
                                  encoding=fields[current_year].get("encoding", "utf-8"))

    if overviews is None:
        return positions, data

    for (overview_csv_name, overview_json_name, year) in overviews:
        overview_json_path = Path(overview_json_name)
        if overview_json_path.exists() and not fields[int(year)].get("skip"):
            if fields[int(year)].get("old"):
                read_old_json_file(overview_json_path, data,
                                   fields[int(year)], year=year)
            else:
                read_json_file(overview_json_path, data, fields[int(year)],
                               year=year)
        else:
            read_csv_file(Path(overview_csv_name), data, year=year,
                          pos_field=f"pos {year}",
                          encoding=fields.get(int(year), {}).get("encoding", "utf-8"))

    return positions, data
