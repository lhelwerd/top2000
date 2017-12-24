from collections import OrderedDict
import bisect
import csv
import itertools
import sys

def find_alternatives(text):
    alternatives = set()
    removes = [
        ",", "!", "?", "?!", "'",
        "The ", "De ", " Experience", " Groep", " Group", " Theme", " Edit"
    ]

    for remove in removes:
        if remove in text:
            alternative = text.replace(remove, "")
            alternatives.add(alternative)

    # Non-breaking space
    if "\xC2\xA0" in text:
        alternative = text.replace("\xC2\xA0", " ")
        alternatives.add(alternative)

    # Curly quote
    if "\xE2\x80\x99" in text:
        alternative = text.replace("\xE2\x80\x99", "'")
        alternatives.add(alternative)

    return alternatives

def find_title_alternatives(title):
    fixes = {
        "The Man Who Sold The World (unplugged)": "The Man Who Sold The World (MTV Unplugged)",
        "Lolo Montez": "Lola Montez",
        "Somebody Will Know Somebody": "Somebody Will Know Someday",
        "Don't Stand To Close To Me": "Don't Stand So Close To Me",
        "Read All About It": "Read All About It, Pt. 3",
        "Ms Jackson": "Ms. Jackson",
        "Mr Rock & Roll": "Mr. Rock & Roll",
        "Suite Judy Blue Eyes": "Suite: Judy Blue Eyes",
        "Rendezvous 6:02": "Rendez-Vous 6:02",
        "Empire State Of Mind (Part II) Broken Down": "Empire State Of Mind",
        "Living On A Prayer": "Livin' On A Prayer",
        "Born In The USA": "Born In The U.S.A.",
        "Slowdancing In A Burning Room": "Slow Dancing In A Burning Room",
        "The Times Are A-Changing": "The Times They Are A-Changin'",
        "The Times They Are A-Changing": "The Times They Are A-Changin'",
        "Musica E": "Musica \xC3\x89",
        "Con Te Partiro": "Con Te Partir\xC3\xB2",
        "Belgie": "Belgi\xC3\xAB (Is Er Leven Op Pluto\xE2\x80\xA6?)",
        "Unforgiven": "The Unforgiven",
        "True Colors": "True Colours",
        "Wake Me Up Before You Gogo": "Wake Me Up Before You Go-Go",
        "Une Belle Histoire / Een Mooi Verhaal": "Une Belle Histoire",
        "It's A Man's Man's World": "It's A Man's Man's Man's World",
        "My Heart Will Go On (Love Theme From 'Tittanic')": "My Heart Will Go On",
        "Het Land Van...": "Het Land Van\xE2\x80\xA6",
        "Its The End Of The World": "It's The End Of The World As We Know It (And I Feel Fine)",
        "Ouverture": "Overture",
        "One Love - People Get Ready": "One Love / People Get Ready",
        "If There's Something": "If There Is Something",
        "The Sun Always Shines On TV": "The Sun Always Shines On T.V.",
        "Hotel Lounge": "Hotellounge",
        "Wer Bisto": "W\xC3\xAAr Bisto",
        "Crying": "Cryin'",
        "Paloma Blanca": "Una Paloma Blanca",
        "Ik Heb Je Lief": "'k Heb Je Lief",
        "Ain't Got No, I Got Life": "Ain't Got No - I Got Life",
        "Non Non Rien N'a Chang\xC3\xA9": "Non, Non, Rien N'a Chang\xC3\xA9"
    }
    if title in fixes:
        return [fixes[title]]

    alternatives = list(find_alternatives(title))
    if " (" in title:
        alternatives.append(title.split(" (")[0])
    if title.startswith("("):
        alternatives.append(title.replace("(", "").replace(")", ""))
        alternatives.append(title.split(") ")[-1])

    alternatives.append(title)
    return alternatives

def find_artist_alternatives(artist):
    alternatives = OrderedDict()
    splits = [" & ", " Feat. ", " feat. ", " ft. ", ", "]
    replaces = {
        " & ": " en ",
        " + ": " & ",
        " \xce\x9b ": " And ", # Lambda
        " Feat. ": " ft. ",
        "Pink": "P!nk",
        "Edith": "\xC3\x89dith",
        "Charly": "Charlie",
        "The Jimi Hendrix Experience": "Jimi Hendrix"
    }
    full_replaces = {
        "One Republic": "OneRepublic",
        "Blue Oyster Cult": "Blue \xC3\x96yster Cult",
        "PHD": "Ph.D.",
        "Run D.M.C.": "Run-D.M.C.",
        "Run DMC & Aerosmith": "Run-D.M.C.",
        "Andre Hazes": "Andr\xC3\xA9 Hazes",
        "Trockener Kecks": "Tr\xC3\xB6ckener Kecks",
        "Neet Oet Lottum": "Neet O\xC3\xA9t Lottum",
        "Bachman Turner Overdrive": "Bachman-Turner Overdrive",
        "Dj Tiesto": "Tiesto",
        "Celine Dion": "C\xC3\xA9line Dion",
        "Jackson 5": "Jackson Five",
        "U2 & Mary J. Blige": "U2 & Mary J Blige",
        "Ren\xC3\xA9 Klijn": "Rene Klijn",
        "Les Poppys": "Poppys",
        "D.C. Lewis": "DC Lewis",
        "The Dave Brubeck Quartet": "Dave Brubeck",
        "Philip Lynott": "Phil Lynott"
    }
    if artist == "Simon & Garfunkel":
        # Do not generate any splits
        return [artist]

    for split in splits:
        parts = artist.split(split)
        alternative = parts[0]
        if alternative != artist:
            alternatives[alternative] = True
            alternatives[parts[-1]] = True
            alternative = split.join(parts[::-1])
            alternatives[alternative] = True

    for search, replace in replaces.iteritems():
        alternative = artist.replace(search, replace)
        if alternative != artist:
            alternatives[alternative] = True

    alternatives.update(dict.fromkeys(find_alternatives(artist), True))

    artist = full_replaces[artist] if artist in full_replaces else artist
    # Ensure normal key is last
    alternatives[artist] = True

    return alternatives.keys()

def check_collision(key, data, year, pos_field):
    return (year is not None and str(year) in data["tracks"][key]) \
            or (pos_field is not None and pos_field in data["tracks"][key])

def update_row(key, row, data, year=None, pos_field=None, best_key=None):
    new_row = row.copy()
    if key in data["tracks"]:
        if check_collision(key, data, year, pos_field):
            print("Potential collision: {!r} {!r} {!r} {!r}".format(key, best_key, row, data["tracks"][key]))
            if best_key == key or (best_key is None and data["tracks"][key]["best"] is not True):
                data["tracks"][key] = new_row
            return best_key, False

        new_row.update(data["tracks"][key])
        if "best" in new_row:
            best_key = key if new_row["best"] is True else new_row["best"]
            #print('best', best_key)

    data["tracks"][key] = new_row
    #print (key, data["tracks"][key])
    return best_key, True

def read_csv_file(csv_name, data, year=None, pos_field="pos",
                  artist_field="artiest", title_field="titel"):
    positions = {}
    last_time = None
    with open(csv_name, 'r') as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            if pos_field in row and row[pos_field] == "":
                # Date/time row
                last_time = row[title_field]
                continue

            if last_time is not None:
                row['timestamp'] = last_time
                last_time = None

            artist_alternatives = find_artist_alternatives(row[artist_field])
            title_alternatives = find_title_alternatives(row[title_field])
            best_key = None
            key = None
            if pos_field in row and year is not None:
                row[str(year)] = row[pos_field]

            keys = set()
            for artist, title in itertools.product(artist_alternatives, title_alternatives):
                key = (artist.lower().strip(), title.lower().strip())
                best_key, ok = update_row(key, row, data, year, pos_field, best_key)
                if ok:
                    keys.add(key)

            if best_key is None:
                #print key
                best_key = key # original artist/title combination

            update_row(best_key, row, data, best_key=best_key)

            keys.discard(best_key)
            for key in keys:
                data["tracks"][key]["best"] = best_key

            if pos_field in row:
                position = int(row[pos_field])
                positions[position] = [best_key] + [key for key in keys if best_key[0].startswith(key[0])]
                if year is None: # current year
                    #print best_key, position
                    data["tracks"][best_key]["best"] = True
                    for key in [best_key] + list(keys):
                        artist_key = key[0]
                        if artist_key not in data["artists"]:
                            data["artists"][artist_key] = []
                        if position not in data["artists"][artist_key]:
                            bisect.insort(data["artists"][artist_key], position)

    return positions

def main(argv):
    first_year = 1999
    csv_name_format = "TOP-2000-{}.csv"
    current_year = int(argv[0]) if len(argv) > 0 else 2017
    previous_year = str(current_year - 1)
    current_year_csv_name = argv[1] if len(argv) > 1 else csv_name_format.format(current_year)
    overview_csvs = (argv[2:], argv[3:]) if len(argv) > 3 else [
        (csv_name_format.format(year), year) for year in ("2014", "2015", "2016")
    ]

    data = {"artists": {}, "tracks": {}}
    positions = read_csv_file(current_year_csv_name, data, year=None,
                              pos_field="pos {}".format(current_year))
    for (overview_csv_name, year) in overview_csvs:
        read_csv_file(overview_csv_name, data, year=year,
                      pos_field="pos {}".format(year))

    columns_per_page = 2
    rows_per_page = 100
    # Headers sizes for 2 columns, 3 headers: 1,05cm 6,36cm 8,55cm
    header = ["nr.", "artiest", "titel"] * columns_per_page
    with open("output.csv", "w") as output_file:
        writer = csv.writer(output_file)
        writer.writerow(header)
        rows = []
        higher_position = None
        for position, keys in sorted(positions.items(), key=lambda p: p[0]):
            if higher_position is not None and position-1 != higher_position:
                raise ValueError("Missing: {}".format(position-1))
            #if data["tracks"][key]["best"] is not True:
            #print(data["tracks"][key])
            higher_position = position

            key = keys[0]
            track = data["tracks"][key]
            #print(track)
            artist = track["artiest"]
            title = track["titel"]

            extra_text = "\xE2\x88\xB4" # therefore sign
            if previous_year in track:
                previous_position = int(track[previous_year])
                diff = abs(position - previous_position)
                if position < previous_position:
                    extra_text = "\xE2\x86\x91{}".format(diff) # upwards arrow
                elif position > previous_position:
                    extra_text = "\xE2\x86\x93{}".format(diff) # downwards arrow
                else:
                    extra_text = "\xE2\x86\x94" # left right arrow
            else:
                for year in range(current_year-2, first_year-1, -1):
                    if str(year) in track and track[str(year)] != "0":
                        if current_year - year - 1 <= 1:
                            extra_text = "\xE2\x9F\xB3" * (current_year - year - 1)
                        else:
                            extra_text = "\xE2\x9F\xB3{}".format(year) # rotation
                        #extra_text = "\xE2\x86\xBA{}".format(year) # rotation
                        break

            #print track

            max_artist = 0
            max_artist_key = None
            for possible_key in keys:
                if possible_key[0] not in data["artists"]:
                    continue
                if len(data["artists"][possible_key[0]]) > max_artist:
                    max_artist = len(data["artists"][possible_key[0]])
                    max_artist_key = possible_key[0]

            #artist_key = key[0]
            if max_artist_key in data["artists"]:
                artist_tracks = data["artists"][max_artist_key]
                #print max_artist_key, artist_tracks
                artist_pos = artist_tracks.index(position)+1
                #if len(artist_tracks) == artist_pos:
                #    extra_text += " {}".format(artist_pos)
                #else:
                extra_text += " {}/{}".format(artist_pos, len(artist_tracks))

            if 'jaar' in track:
                artist += " ({})".format(track['jaar'])
            #if 'timestamp' in track:
            #    parts = track['timestamp'].split(' ')
            #    artist += " {}/12 {:02}:00".format(parts[0], 
            #    int(parts[2].split('-')[0]))

            row = [position, artist, "{} ({})".format(title, extra_text)]
            #writer.writerow(row)

            line = "{}. {} - {} ({})".format(position, artist, title, extra_text)
            #if "2016" not in track and "2015" not in track and "2014" not in track:
            if 'jaar' not in track:
                pass
            print(line)

            page_position = position % (rows_per_page * columns_per_page)
            if page_position == 0 or page_position > rows_per_page:
                #print((position - 1) % rows_per_page, 2, len(rows))
                rows[(position - 1) % rows_per_page].extend(row)
            else:
                #print(page_position-1, 1, len(rows))
                rows.append(row)

            if page_position == 0:
                #print('WRITE')
                writer.writerows(rows)
                rows = []

        if rows:
            writer.writerows(rows)

if __name__ == "__main__":
    main(sys.argv[1:])
