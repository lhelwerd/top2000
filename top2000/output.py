"""
CSV chart output.
"""

# pylint: disable=too-many-arguments, too-many-locals, too-many-branches
# pylint: disable=too-many-statements

from collections import OrderedDict
import csv
from datetime import datetime
from pathlib import Path

def output_file(positions, data, first_year, current_year, columns_per_page=2,
                rows_per_page=100, reverse=False, columns=None, path=None):
    """
    Write a CSV file as output.
    """

    previous_year = str(current_year - 1)
    if columns is None:
        columns = OrderedDict([
            ("position", "nr."),
            ("artist", "artiest"),
            ("title", "titel")
        ])
    if path is None:
        path = Path("output.csv")

    # Headers sizes for 2 columns, 3 headers: 1,05cm 6,36cm 8,55cm
    # Margins: left, right, top, bottom: 0,30cm 0,30cm 0,90cm 0,30cm
    # Disable print header/footer. Scale factor: 62%
    # Format -> Print ranges -> Edit -> Rows to repeat -> $1
    # Bold first row, right-align first and fourth column
    # Add grey border at bottom of each/first row, between each 3-header column
    header = list(columns.values()) * columns_per_page
    with path.open("w", encoding='utf-8') as output:
        writer = csv.writer(output)
        writer.writerow(header)
        rows = []
        last_position = None
        last_timestamp = None
        lines = 0
        extra_lines = 0
        for position, keys in sorted(positions.items(),
                                     key=lambda p: -p[0] if reverse else p[0]):
            if reverse:
                if last_position is not None and position + 1 != last_position:
                    raise ValueError(f"Missing: {position + 1}")
            else:
                if last_position is not None and position - 1 != last_position:
                    raise ValueError(f"Missing: {position - 1}")

            key = keys[0]
            track = data["tracks"][key]
            artist = track["artiest"]
            title = track["titel"]

            extra_text = "\u2234" # therefore sign
            #extra_text = "\U0001f195" # new sign
            if previous_year in track:
                previous_position = int(track[previous_year])
                diff = abs(position - previous_position)
                if position < previous_position:
                    #extra_text = f"\xE2\x86\x91{diff}" # upwards arrow
                    #extra_text = f"\u2b06\ufe0e{diff}" # upwards arrow
                    #extra_text = f"\u21b0{diff}" # upwards arrow
                    extra_text = f"\u219f{diff}" # upwards arrow
                elif position > previous_position:
                    #extra_text = f"\xE2\x86\x93{diff}" # downwards arrow
                    #extra_text = f"\u2b07\ufe0e{diff}" # downwards arrow
                    #extra_text = f"\u21b2{diff}" # downwards arrow
                    extra_text = f"\u21a1{diff}" # downwards arrow
                else:
                    extra_text = "\u21c4" # left right arrow
                    #extra_text = "\U0001f51b" # left right arrow
            else:
                for year in range(int(current_year)-2, first_year-1, -1):
                    if str(year) in track and track[str(year)] != "0":
                        #if current_year - year - 1 <= 1:
                        #    extra_text = "\xE2\x9F\xB3"
                        #    extra_text *= current_year - year - 1
                        #else:
                        #extra_text = f"\u27f2{year}" # rotation
                        #extra_text = f"\xE2\x86\xBA{year}" # rotation
                        extra_text = f"\u21ba{year}" # rotation
                        #extra_text = f"\U0001f504{year}" # arrow circle
                        break

            # Album version indicator
            if track.get("album_version"):
                title += " \u29be"

            max_artist = 0
            max_artist_key = None
            max_track_position = 0
            for possible_key in keys:
                #if track["titel"] == "We All Stand Together":
                #    print(possible_key, max_artist, max_artist_key,
                #          data["artists"].get(possible_key[0]))
                if possible_key[0] not in data["artists"]:
                    continue
                num_tracks = len(data["artists"][possible_key[0]])
                track_position = data["artists"][possible_key[0]].index(position)
                #if title.startswith("Als Ik Je Weer Zie"):
                #    print(possible_key, num_tracks, track_position,
                #          max_artist, max_track_position)
                if num_tracks > max_artist or \
                        (num_tracks == max_artist and
                         track_position > max_track_position):
                    # Doesn't it make more sense to do track_position < max...
                    # so that we show the best position among the artists?
                    max_artist = num_tracks
                    max_artist_key = possible_key[0]
                    max_track_position = data["artists"][possible_key[0]].index(position)

            #artist_key = key[0]
            if max_artist_key in data["artists"]:
                artist_tracks = data["artists"][max_artist_key]
                #print(max_artist_key, artist_tracks)
                artist_pos = artist_tracks.index(position)+1
                #if len(artist_tracks) == artist_pos:
                #    extra_text += f" {artist_pos}"
                #else:
                extra_text += f" {artist_pos}/{len(artist_tracks)}"

            for title_year_field in ('yr', 'jaar'):
                if title_year_field in track:
                    artist += f" ({track[title_year_field]})"
                    break

            cells = {
                "position": position,
                "artist": artist,
                "title": f"{title} ({extra_text})"
            }

            #if 'timestamp' in track:
            #    parts = track['timestamp'].split(' ')
            #    time += f"{parts[0]}/12 {int(parts[2].split('-')[0]):02}:00"
            #    artist += time
            if 'timestamp' in track:
                if isinstance(track['timestamp'], str) and last_timestamp is not None:
                    parts = track['timestamp'].split(' ')
                    time = f" {parts[0]}/12 {int(parts[2].split('-')[0]):02}:00"
                    if time != last_timestamp:
                        last_timestamp = time
                        if add_row(rows, ['', time, ''], positions, position,
                                   last_position, extra_lines, rows_per_page,
                                   columns_per_page, reverse):
                            #print('WRITE')
                            writer.writerows(rows)
                            rows = []
                            extra_lines = 0
                        else:
                            extra_lines += 1
                elif isinstance(track['timestamp'], int):
                    date = datetime.fromtimestamp(track['timestamp'] / 1000)
                    cells["timestamp"] = datetime.strftime(date, "%d.%H:%M")
                #else:
                #    print(track)
            #else:
            #    print(track)

            row = [cells.get(column, "") for column in columns]
            #writer.writerow(row)

            # pylint: disable=line-too-long

            # Start debug lines

            #line = f"{position}. {artist} - {title} ({extra_text})"
            #prv_field = "prv"

            # SONGS THAT WERE RELEASED BEFORE THIS YEAR BUT ARE NEW
            #first_csv_year = 2014
            #if all(str(year) not in track for year in range(first_csv_year, current_year)) and ("jaar" not in track or track["jaar"] != str(current_year)):#and position < 1224:
            # OLD VERSIONS OF THE FORMER
            #if "2018" not in track and "2017" not in track and "2016" not in track and "2015" not in track and "2014" not in track and ("yr" not in track or track["yr"] != str(current_year)): #and position > 1773:
            #if "2018" not in track and ("2017" in track or "2016" in track or "2015" in track) and ("jaar" not in track or track["jaar"] != str(current_year)): #and position > 1773:
            #if "2019" not in track and ("2018" in track or "2017" in track or "2016" in track or "2015" in track) and ("jaar" not in track or track["jaar"] != str(current_year)): #and position > 1773:
            # MISSING YEARS
            #if 'yr' not in track and 'jaar' not in track:
            # UPPERCASE ARTISTS/TITLES (sometimes happens with new tracks?)
            #if (artist.isupper() or title.isupper() or artist.islower() or title.islower()) and (title.isupper() or track["artiest"] not in ("U2", "10cc", "INXS", "KISS", "Q65", "LP", "ABBA", "MGMT", "R.E.M.", "UB40", "3JS", "BAP", "AC/DC", "S10")):
                #pass
            # INCONSISTENT PREVIOUS YEAR FIELDS (missing/wrong merges/etc)
            #if (prv_field in track and int(track[prv_field]) != int(track.get(previous_year, 0))):
            #if max_artist_key not in data["artists"] or (len(data["artists"][max_artist_key]) == 1 and artist.count(' ') > 2):
                #lines += 1
                #print(line)
                #print(track)
                #print(keys)
                #print(f"{line} prv={track[prv_field]} {previous_year}={track.get(previous_year)}")

            if add_row(rows, row, positions, position, last_position,
                       extra_lines, rows_per_page, columns_per_page, reverse):
                #print('WRITE')
                writer.writerows(rows)
                rows = []
                extra_lines = 0

            last_position = position #+ extra_lines

        if rows:
            writer.writerows(rows)


    print(f'{lines} lines above indicate fixes that may need to be applied.')
    return lines == 0

def add_row(rows, row, positions, position, last_position, extra_lines,
            rows_per_page, columns_per_page, reverse):
    """
    Insert a row in the proper location of a page of a CSV spreadsheet if it
    were printed in certain column counts and rows per page.
    """

    rows_total = rows_per_page * columns_per_page
    if reverse:
        page_position = (len(positions) - position + 1 - extra_lines) % rows_total
    else:
        page_position = (position + extra_lines) % rows_total

    if columns_per_page > 1 and (page_position == 0 or page_position > rows_per_page):
        if reverse:
            last_row = (len(positions) - last_position + 1) % rows_per_page
        else:
            last_row = last_position % rows_per_page
        rows[last_row].extend(row)
    else:
        rows.append(row)

    return page_position == 0
