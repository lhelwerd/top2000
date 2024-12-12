"""
CSV chart output.
"""

import csv
from datetime import datetime
from pathlib import Path
from typing import Sequence
from .base import Format
from ..readers.base import Base as ReaderBase, Key, Row as Track, Positions, \
    Tracks, Artists

class CSV(Format):
    """
    CSV file with multi-column layout.
    """

    @property
    def format(self) -> str:
        return "csv"

    def reset(self) -> None:
        super().reset()
        self._rows: list[list[str]] = []
        self._last_timestamp: str | None = None
        self._lines = 0
        self._extra_lines = 0

    def output_file(self, data: ReaderBase, output_format: str,
                    path: Path | None = None) -> bool:
        if path is None:
            path = Path(f"output-{output_format}.csv")

        # Headers sizes for 2 columns, 3 headers: 1,05cm 6,36cm 8,55cm
        # Margins: left, right, top, bottom: 0,30cm 0,30cm 0,90cm 0,30cm
        # Disable print header/footer. Scale factor: 62%
        # Format -> Print ranges -> Edit -> Rows to repeat -> $1
        # Bold first row, right-align first and fourth column
        # Add grey border at bottom of each/first row, between 3-header column
        columns = self._get_int_setting(output_format, "columns_per_page", 2)
        column_names = self._get_dict_setting(output_format, "columns")
        reverse = self._get_bool_setting(output_format, "reverse")
        header = list(column_names.values()) * columns
        self.reset()
        with path.open("w", encoding='utf-8') as output:
            writer = csv.writer(output)
            writer.writerow(header)
            for position, keys in self._sort_positions(data.positions, reverse):
                cells = self._format_cells(position, keys, data.tracks,
                                           data.artists)
                if self._format_timestamp(output_format, cells, data.positions,
                                          position):
                    writer.writerows(self._rows)
                    self._rows = []

                row = [cells.get(column, "") for column in column_names]
                #writer.writerow(row)

                self.validate_row(keys, cells, data.tracks, data.artists)

                if self.add_row(output_format, row, data.positions, position):
                    #print('WRITE')
                    writer.writerows(self._rows)
                    self._rows = []
                    self._extra_lines = 0

                # Check position ordering last so that add_row can access
                # previous position still
                self._check_position(position, reverse)

            if self._rows:
                writer.writerows(self._rows)


        print(f'{self._lines} lines above indicate problems with tracks.')
        return self._lines == 0

    def _format_cells(self, position: int, keys: Sequence[Key],
                      tracks: Tracks, artists: Artists) -> dict[str, str]:
        key = keys[0]
        track = tracks[key]
        artist = str(track["artiest"])
        title = str(track["titel"])

        extra_text = self._format_rank_change(track, position)

        # Album version indicator
        if track.get("album_version"):
            title += " \u29be"

        max_artist_key = self._find_artist_chart(position, keys, artists)
        extra_text += self._format_artist_chart(position,
                                                max_artist_key, artists)

        if "jaar" in track:
            artist += f' ({track["jaar"]})'

        return {
            "position": str(position),
            "artist": artist,
            "title": f"{title} ({extra_text})",
            "timestamp": str(track.get("timestamp", ""))
        }

    def _format_rank_change(self, track: Track, position: int) -> str:
        previous_year = str(self._current_year - 1)
        if previous_year in track:
            previous_position = int(track[previous_year])
            diff = abs(position - previous_position)
            if position < previous_position:
                #return f"\xE2\x86\x91{diff}" # upwards arrow
                #return f"\u2b06\ufe0e{diff}" # upwards arrow
                #return f"\u21b0{diff}" # upwards arrow
                return f"\u219f{diff}" # upwards arrow
            if position > previous_position:
                #return f"\xE2\x86\x93{diff}" # downwards arrow
                #return f"\u2b07\ufe0e{diff}" # downwards arrow
                #return f"\u21b2{diff}" # downwards arrow
                return f"\u21a1{diff}" # downwards arrow

            # Stayed the same
            return "\u21c4" # left right arrow
            #return "\U0001f51b" # left right arrow

        for year in range(self._current_year - 2, self._first_year - 1, -1):
            if str(year) in track and track[str(year)] != "0":
                #if current_year - year - 1 <= 1:
                #    extra_text = "\xE2\x9F\xB3"
                #    extra_text *= current_year - year - 1
                #    return extra_text
                #else:
                #return f"\u27f2{year}" # rotation
                #return f"\xE2\x86\xBA{year}" # rotation
                return f"\u21ba{year}" # rotation
                #return f"\U0001f504{year}" # arrow circle

        return "\u2234" # therefore sign
        #return "\U0001f195" # new sign

    @staticmethod
    def _find_artist_chart(position: int, keys: Sequence[Key],
                           artists: Artists) -> str | None:
        max_tracks = 0
        max_artist_key = None
        max_position = 0
        for possible_key in keys:
            #if possible_key[1] == "we all stand together":
            #    print(possible_key, max_tracks, max_artist_key,
            #          artists.get(possible_key[0]))
            if possible_key[0] not in artists:
                continue
            num_tracks = len(artists[possible_key[0]])
            track_position = artists[possible_key[0]].index(position)
            #if possible_key[1].startswith("als ik je weer zie"):
            #    print(possible_key, num_tracks, track_position,
            #          max_tracks, max_position)
            if num_tracks > max_tracks or \
                    (num_tracks == max_tracks and
                     track_position > max_position):
                max_tracks = num_tracks
                max_artist_key = possible_key[0]
                max_position = artists[possible_key[0]].index(position)

        return max_artist_key

    @staticmethod
    def _format_artist_chart(position: int, max_artist_key: str | None,
                             artists: Artists) -> str:
        if max_artist_key in artists:
            artist_tracks = artists[max_artist_key]
            #print(max_artist_key, artist_tracks)
            artist_pos = artist_tracks.index(position) + 1
            #if len(artist_tracks) == artist_pos:
            #    extra_text += f" {artist_pos}"
            #else:
            return f" {artist_pos}/{len(artist_tracks)}"
        return ""

    def _format_timestamp(self, output_format: str, cells: dict[str, str],
                          positions: Positions, position: int) -> bool:
        #if 'timestamp' in track:
        #    parts = track['timestamp'].split(' ')
        #    time += f"{parts[0]}/12"
        #    time += f" {int(parts[2].split('-')[0]):02}:00"
        #    artist += time
        if 'timestamp' in cells:
            if cells['timestamp'].isnumeric():
                date = datetime.fromtimestamp(int(cells['timestamp']) / 1000)
                cells["timestamp"] = datetime.strftime(date, "%d.%H:%M")
                return False
            if self._last_timestamp is not None:
                parts = cells['timestamp'].split(' ')
                time = f" {parts[0]}/12 {int(parts[2].split('-')[0]):02}:00"
                cells.pop('timestamp')
                if time != self._last_timestamp:
                    self._last_timestamp = time
                    if self.add_row(output_format, ['', time, ''],
                                    positions, position):
                        self._extra_lines = 0
                        return True

                    self._extra_lines += 1
                    return False
            #print(track)
        #else:
        #    print(track)
        return False

    def validate_row(self, keys: list[Key], cells: dict[str, str],
                     tracks: Tracks, artists: Artists) -> None:
        """
        Validate whether a track to be output is actually proper.
        """
        # pylint: disable=line-too-long, unused-argument

        # Start debug lines

        #line = f'{cells["position"]}. {cells["artist"]} - {cells["title"]}'
        #prv_field = "prv"

        #previous_year = str(self._current_year - 1)
        #track = tracks[keys[0]]
        #artist = track["artiest"]
        #title = track["titel"]
        # SONGS THAT WERE RELEASED BEFORE THIS YEAR BUT ARE NEW
        #first_csv_year = 2014
        #if all(str(year) not in track for year in range(first_csv_year, self._current_year)) and ("jaar" not in track or track["jaar"] != str(self._current_year)):#and position < 1224:
        # OLD VERSIONS OF THE FORMER
        #if "2018" not in track and "2017" not in track and "2016" not in track and "2015" not in track and "2014" not in track and ("yr" not in track or track["yr"] != str(self._current_year)): #and position > 1773:
        #if "2018" not in track and ("2017" in track or "2016" in track or "2015" in track) and ("jaar" not in track or track["jaar"] != str(self._current_year)): #and position > 1773:
        #if "2019" not in track and ("2018" in track or "2017" in track or "2016" in track or "2015" in track) and ("jaar" not in track or track["jaar"] != str(self._current_year)): #and position > 1773:
        # MISSING YEARS
        #if 'yr' not in track and 'jaar' not in track:
        # UPPERCASE ARTISTS/TITLES (sometimes happens with new tracks?)
        #if (artist.isupper() or title.isupper() or artist.islower() or title.islower()) and (title.isupper() or track["artiest"] not in ("U2", "10cc", "INXS", "KISS", "Q65", "LP", "ABBA", "MGMT", "R.E.M.", "UB40", "3JS", "BAP", "AC/DC", "S10")):
            #pass
        # INCONSISTENT PREVIOUS YEAR FIELDS (missing/wrong merges/etc)
        #if (prv_field in track and int(track[prv_field]) != int(track.get(previous_year, 0))):
        #if max_artist_key not in artists or (len(artists[max_artist_key]) == 1 and artist.count(' ') > 2):
            #self._lines += 1
            #print(line)
            #print(track)
            #print(keys)
            #print(f"{line} prv={track[prv_field]} {previous_year}={track.get(previous_year)}")

    def add_row(self, output_format: str, row: list[str], positions: Positions,
                position: int) -> bool:
        """
        Insert a row in the proper location of a page of a CSV spreadsheet if it
        were printed in certain column counts and rows per page.
        """

        rows = self._get_int_setting(output_format, "rows_per_page", 100)
        columns = self._get_int_setting(output_format, "columns_per_page", 2)
        reverse = self._get_bool_setting(output_format, "reverse")
        rows_total = rows * columns
        if reverse:
            page_position = len(positions) - position + 1 - self._extra_lines
            page_position %= rows_total
        else:
            page_position = (position + self._extra_lines) % rows_total

        if columns > 1 and self._last_position is not None and \
                (page_position == 0 or page_position > rows):
            if reverse:
                last_row = (len(positions) - self._last_position + 1) % rows
            else:
                last_row = self._last_position % rows
            self._rows[last_row].extend(row)
        else:
            self._rows.append(row)

        return page_position == 0
