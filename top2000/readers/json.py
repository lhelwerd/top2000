"""
NPO Radio 2 Top 2000 JSON API file reader.
"""

import json
from .base import read_row

def read_old_json_file(json_path, data, fields, year):
    """
    Read a JSON file with track position data in a flattened array of objects.
    """

    pos_field = fields.get("pos", "position")
    artist_field = fields.get("artist", "artist")
    title_field = fields.get("title", "title")
    prv_field = fields.get("prv", "lastPosition")

    positions = {}
    last_time = None
    with json_path.open('r', encoding='utf-8') as json_file:
        rows = fields["rows"](json.load(json_file))
        for row in rows:
            last_time = read_row(row, data, positions, year, pos_field,
                                 artist_field, title_field, prv_field,
                                 last_time=last_time)

    return positions

def read_json_file(json_path, data, fields, year):
    """
    Read a JSON file with track position data in an array of objects with
    nested position and track data.
    """

    # In "position"
    pos_field = fields.get("pos", "current")
    prv_field = fields.get("prv", "previous")
    # In "track"
    artist_field = fields.get("artist", "artist")
    title_field = fields.get("title", "title")
    # In primary object
    time_field = fields.get("time", "broadcastUnixTime")

    positions = {}
    # Check if all the JSONs are UTF-8 encoded
    with json_path.open('r', encoding='utf-8') as json_file:
        rows = fields["rows"](json.load(json_file))
        for row in rows:
            row['pos'] = row['position'][pos_field]
            row['prv'] = row['position'][prv_field]
            row['artist'] = row['track'][artist_field]
            row['title'] = row['track'][title_field]
            read_row(row, data, positions, year,
                     'pos', 'artist', 'title', 'prv', time_field=time_field)

    return positions
