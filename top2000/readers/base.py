"""
Base row-based data parser.
"""

# pylint: disable=too-many-arguments, too-many-locals, too-many-branches
# pylint: disable=too-many-statements

import bisect
import itertools
from ..collision import update_row
from ..normalization import find_artist_alternatives, find_title_alternatives

def read_row(row, data, positions, year, pos_field, artist_field, title_field,
             prv_field="prv", time_field=None, last_time=None, offset=0):
    """
    Read data extracted from a CSV row or JSON array element.
    """

    if pos_field in row and row[pos_field] == "":
        # Date/time row, track last_time
        return row[title_field]

    if year is None:
        # Album version indicator
        # For older years, this is removed in the title alternatives
        if row[title_field].lower().endswith("albumversie)"):
            row['album_version'] = True
            row[title_field] = row[title_field].replace(" (Albumversie)", "") \
                .replace(" (albumversie)", "").replace(" Albumversie)", ")")

        if time_field is not None and time_field in row:
            row['timestamp'] = row[time_field]
            last_time = None
        elif last_time is not None:
            row['timestamp'] = last_time
            last_time = None

    artist_alternatives = find_artist_alternatives(row[artist_field])
    title_alternatives = find_title_alternatives(row[title_field])
    position = int(row[pos_field]) + offset if pos_field in row else None
    best_key = None
    key = None
    if year is not None:
        row.pop(prv_field, None)
        if pos_field in row:
            row[str(year)] = row[pos_field]

    keys = set()
    rejected_keys = set()
    if year is None and position in positions:
        best_key = positions[position][0]
        keys = set(positions[position])
    else:
        for artist, title in itertools.product(artist_alternatives, title_alternatives):
            key = (artist.lower().strip(), title.lower().strip())
            # Ignore alternative-pairs which we have done for this year already
            # This can happen because the keys are case-insensitive
            if key in keys or key in rejected_keys:
                continue

            best_key, valid = update_row(key, row, data, year, pos_field,
                                         best_key)
            if valid:
                keys.add(key)
            else:
                rejected_keys.add(key)

    if best_key is None:
        best_key = key # original artist/title combination

    #if "iron butterfly" in row[artist_field].lower():#and "Comptine" in row[title_field]:
    #if "Boogie Wonderland" in row[title_field]:
    #    print(year, artist_alternatives, title_alternatives, best_key,
    #          data["tracks"][best_key])
    best_key = update_row(best_key, row, data, best_key=best_key)[0]
    if year is None: # only update to best combination for current year
        data["tracks"][best_key]["artiest"] = artist_alternatives[-1]
        data["tracks"][best_key]["titel"] = title_alternatives[-1]
        #if data["tracks"][best_key]["titel"].startswith("Comptine"):
        #    print(title_alternatives)
        #    print(data["tracks"][best_key])

    keys.discard(best_key)
    for key in keys:
        if data["tracks"][key].get("best") is not True:
            data["tracks"][key]["best"] = best_key

    # Now we handle row[pos_field] and finalize best keys in the data
    if position is not None:
        if year is not None:
            data["tracks"][best_key][str(year)] = row[pos_field]

        positions[position] = [best_key] + [
            key for key in keys
            if best_key[0].startswith(key[0]) or
            not any(rejected_key[0].startswith(key[0])
                    for rejected_key in rejected_keys)
        ]
        if year is None: # current year
            data["tracks"][best_key]["best"] = True
            for key in [best_key] + list(keys):
                #if "Mary J" in row[artist_field]:
                #    print(position, key, data["artists"].get(key[0]))
                artist_key = key[0]
                if artist_key not in data["artists"]:
                    data["artists"][artist_key] = []
                if position not in data["artists"][artist_key]:
                    bisect.insort(data["artists"][artist_key], position)

    return last_time
