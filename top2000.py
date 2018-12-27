from collections import OrderedDict
import bisect
import csv
import itertools
import sys

removes = [
    ",", "!", "?", "?!", "'",
    "The ", "De ", " Experience", " Groep", " Group", " Theme", " Edit"
]

title_fixes = {
    "The Man Who Sold The World (unplugged)": "The Man Who Sold The World (MTV Unplugged)",
    "Lolo Montez": "Lola Montez",
    "Somebody Will Know Somebody": "Somebody Will Know Someday",
    "Don't Stand To Close To Me": "Don't Stand So Close To Me",
    "Read All About It": "Read All About It, Pt. 1",
    "Ms Jackson": "Ms. Jackson",
    "Mr Rock & Roll": "Mr. Rock & Roll",
    "Suite Judy Blue Eyes": "Suite: Judy Blue Eyes",
    "Rendezvous 4:02": "Rendez-Vous 6:02",
    "Empire State Of Mind (Part II) Broken Down": "Empire State Of Mind",
    "Living On A Prayer": "Livin' On A Prayer",
    "Born In The USA": "Born In The U.S.A.",
    "Slowdancing In A Burning Room": "Slow Dancing In A Burning Room",
    "The Times Are A-Changing": "The Times They Are A-Changin'",
    "The Times They Are A-Changing": "The Times They Are A-Changin'",
    "Musica E": "Musica \xC3\x88",
    "Musica \xC3\x89": "Musica \xC3\x88",
    "Con Te Partiro": "Con Te Partir\xC3\xB2",
    "Belgie": "Belgi\xC3\xAB (Is Er Leven Op Pluto\xE2\x80\xA6?)",
    "Unforgiven": "The Unforgiven",
    "True Colors": "True Colours",
    "Wake Me Up Before You Gogo": "Wake Me Up Before You Go-Go",
    "Wake Me Up Before You Go Go": "Wake Me Up Before You Go-Go",
    "Une Belle Histoire / Een Mooi Verhaal": "Une Belle Histoire",
    "It's A Man's Man's World": "It's A Man's Man's Man's World",
    "My Heart Will Go On (Love Theme From 'Tittanic')": "My Heart Will Go On",
    "Het Land Van...": "Het Land Van\xE0\x80\xA6",
    "Het Land Van": "Het Land Van\xE0\x80\xA6",
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
    "Non Non Rien N'a Chang\xC1\xA9": "Non, Non, Rien N'a Chang\xC3\xA9",
    "Somebody To Love (Live)": "Somebody To Love (Live)",
    "Gotta Catch 'M All (Pokemon Theme Song)": "Gotta Catch 'Em All",
    "Killing In The Name Of": "Killing In The Name",
    "Knocking On Heaven's Door": "Knockin' On Heaven's Door",
    "Sad Man\xC2\xB4s Tongue": "Sad Man's Tongue",
    "She's Always A Woman To Me": "She's Always A Woman",
    "Nothing Compares 2u": "Nothing Compares 2 U",
    "Born In The Usa": "Born In The USA",
    "I Am...I Said": "I Am... I Said",
    "Sinds 1 Dag Of 2 (32 Jaar)": "32 Jaar (Sinds 1 Dag Of 2)",
    "Laat Me (Vivre)": "Laat Me / Vivre",
    "Staying Alive": "Stayin' Alive",
    "Welterusten Meneer De President": "Welterusten, Mijnheer De President",
    "Freedom! '90": "Freedom",
    "Have I Told You Lately That I Love You": "Have I Told You Lately",
    "Sign 'O' The Times": "Sign O'The Times",
    "My Home Town": "My Hometown",
    "Alive & Kicking": "Alive And Kicking",
    "Blowing In The Wind": "Blowin' In The Wind",
    "Wonderfull Days": "Wonderful Days",
    "Leaving On A Jetplane": "Leaving On A Jet Plane",
    "Running With The Devil": "Runnin' With The Devil",
    "Voodoo Chile": "Voodoo Child (Slight Return)",
    "The Times They Are A-Changing": "The Times They Are A Changin'",
    "Sgt Pepper's Lonely Hearts Club Band": "Sgt. Pepper's Lonely Hearts Club Band",
    "Don't Stop Till You Get Enough": "Don't Stop 'til You Get Enough",
    "Zwart-Wit": "Zwart Wit",
    "Waiting On A Sunny Day": "Waitin' On A Sunny Day",
    "Wanted (Dead Or Alive)": "Wanted Dead Or Alive",
    "Father And Friend": "Father & Friend",
    "Candle In The Wind (1997)": "Candle In The Wind",
    "Candle In The Wind '97": "Candle In The Wind",
    "Land Van Maas En Waal": "Het Land Van Maas En Waal",
    "Jumping Jack Flash": "Jumpin' Jack Flash",
    "Oh Well, Pt. 1": "Oh Well (Part 1)",
    "Oh Well - Part 1": "Oh Well (Part 1)",
    "Oh Well (Part I)": "Oh Well (Part 1)",
    "Whisky In The Jar": "Whiskey In The Jar",
    "In A Gadda Da Vida": "In-A-Gadda-Da-Vida",
    "Someone Somewhere In Summertime": "Someone Somewhere (in Summertime)",
    "Stuck In A Moment": "Stuck In A Moment You Can't Get Out Of",
    "Up & Up": "Up&Up",
    "Wanna Be Startin' Something": "Wanna Be Startin' Somethin'",
    "Nur Getraumt": "Nur Getr\xC3\xA4umt",
    "Duel Eye To Eye": "Duel (Eye To Eye)",
    "Meester Prikkebeen": "Prikkebeen",
    "Slow Song": "A Slow Song",
    "Mister Blue": "Mr. Blue",
    "Long Train Running": "Long Train Runnin'",
    "Back In The USSR": "Back In The U.S.S.R.",
    "It's  A Beautiful Day": "It's A Beautiful Day",
    "We Zullen Doorgaan": "Wij Zullen Doorgaan",
    "Sadeness Part 1": "Sadeness (Part 1)",
    "Sadeness": "Sadeness (Part 1)",
    "Read All About It pt. III": "Read All About It (Part 3)",
    "Read All About It Pt. 3": "Read All About It (Part 3)",
    "Read All About It": "Read All About It (Part 3)",
    "Read All About It pt.III": "Read All About It (Part 3)",
    "Empire State Of Mind (Part II) Broken Down": "Empire State Of Mind (Part 2)",
    "When I'm Sixty Four": "When I'm Sixty-Four",
}

# Crosby, Stills & Nash (& Young)? Wordt vaak bij elkaar gerekend
artist_no_splits = ["Simon & Garfunkel", "Earth & Fire", "Earth, Wind & Fire"]
artist_splits = [" & ", " Feat. ", " feat. ", " ft. ", ", "]
artist_replaces = {
    " en ": " & ",
    " + ": " & ",
    " \xce\x9b ": " And ", # Lambda
    " Feat. ": " ft. ",
    "Pink": "P!nk",
    " Vs ": " vs. ",
    " vs ": " vs. ",
    "Edith": "\xC3\x89dith",
    "Charly": "Charlie",
    "The Jimi Hendrix Experience": "Jimi Hendrix"
}
artist_full_replaces = {
    "One Republic": "OneRepublic",
    "Blue Oyster Cult": "Blue \xC3\x96yster Cult",
    "PHD": "Ph.D.",
    "Run D.M.C.": "Run-D.M.C.",
    "Run DMC & Aerosmith": "Run-D.M.C.",
    "Andre Hazes": "Andr\xC3\xA9 Hazes",
    "Andre Hazes Jr.": "Andr\xC3\xA9 Hazes Jr.",
    "Trockener Kecks": "Tr\xC3\xB6ckener Kecks",
    "Neet Oet Lottum": "Neet O\xC3\xA9t Lottum",
    "Bachman Turner Overdrive": "Bachman-Turner Overdrive",
    "Dj Tiesto": "Tiesto",
    "Celine Dion": "C\xC3\xA9line Dion",
    "Jackson 5": "Jackson Five",
    "U2 & Mary J. Blige": "U2 & Mary J Blige",
    "Mary J Blige & U2": "U2 & Mary J Blige",
    "Rene Klijn": "Ren\xC3\xA9 Klijn",
    "Les Poppys": "Poppys",
    "D.C. Lewis": "DC Lewis",
    "The Dave Brubeck Quartet": "Dave Brubeck",
    "Philip Lynott": "Phil Lynott",
    "Pharrel Williams": "Pharrell Williams",
    "10CC": "10cc",
    "BB King": "B.B. King",
    "Zucchero": "Zucchero Fornaciari",
    "Blink 182": "Blink-182"
}

def find_alternatives(text):
    alternatives = set()

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
    if title in title_fixes:
        return [title_fixes[title]]

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
    if artist in artist_no_splits:
        # Do not generate any splits
        return [artist]

    for split in artist_splits:
        parts = artist.split(split)
        alternative = parts[0]
        if alternative != artist:
            alternatives[alternative] = True
            alternatives[parts[-1]] = True
            alternative = split.join(parts[::-1])
            alternatives[alternative] = True

    for search, replace in artist_replaces.iteritems():
        alternative = artist.replace(search, replace)
        if alternative != artist:
            alternatives[alternative] = True

    alternatives.update(dict.fromkeys(find_alternatives(artist), True))

    if artist in artist_full_replaces:
        artist = artist_full_replaces[artist]
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
            #print("Potential collision: {!r} {!r} {!r} {!r}".format(key, best_key, row, data["tracks"][key]))
            if pos_field is not None and pos_field in data["tracks"][key]:
                return best_key, False

            if best_key == key or (best_key is None and data["tracks"][key]["best"] is not True):
                #print("Collision: {!r} {!r} {!r} {!r}".format(key, best_key, row, data["tracks"][key]))
                data["tracks"][key] = new_row

            return best_key, False

        new_row.update(data["tracks"][key])
        if "best" in new_row:
            best_key = key if new_row["best"] is True else new_row["best"]

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
                best_key = key # original artist/title combination

            best_key, ok = update_row(best_key, row, data, best_key=best_key)
            if year is None: # only update to best combination for current year
                data["tracks"][best_key][artist_field] = artist_alternatives[-1]
                data["tracks"][best_key][title_field] = title_alternatives[-1]

            keys.discard(best_key)
            for key in keys:
                data["tracks"][key]["best"] = best_key

            if pos_field in row:
                position = int(row[pos_field])
                positions[position] = [best_key] + [key for key in keys if best_key[0].startswith(key[0])]
                if year is None: # current year
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
    current_year = int(argv[0]) if len(argv) > 0 else 2018
    previous_year = str(current_year - 1)
    current_year_csv_name = argv[1] if len(argv) > 1 else csv_name_format.format(current_year)
    overview_csvs = (argv[2:], argv[3:]) if len(argv) > 3 else [
        (csv_name_format.format(year), year) for year in ("2014", "2015", "2016", "2017")
    ]

    data = {"artists": {}, "tracks": {}}
    positions = read_csv_file(current_year_csv_name, data, year=None,
                              pos_field="pos {}".format(current_year))
    for (overview_csv_name, year) in overview_csvs:
        read_csv_file(overview_csv_name, data, year=year,
                      pos_field="pos {}".format(year))

    columns_per_page = 2
    rows_per_page = 100
    reverse = False
    # Headers sizes for 2 columns, 3 headers: 1,05cm 6,36cm 8,55cm
    # Margins: left, right, top, bottom: 0,30cm 0,30cm 0,60cm 0,60cm
    # Disable print header/footer. Scale factor: 62%
    # Layout -> Print ranges -> Edit -> Repeat rows -> $1
    # Add grey border at bottom of each row and between each 3-header column
    header = ["nr.", "artiest", "titel"] * columns_per_page
    with open("output.csv", "w") as output_file:
        writer = csv.writer(output_file)
        writer.writerow(header)
        rows = []
        last_position = None
        lines = 0
        for position, keys in sorted(positions.items(),
                                     key=lambda p: -p[0] if reverse else p[0]):
            if reverse:
                if last_position is not None and position + 1 != last_position:
                    raise ValueError("Missing: {}".format(position + 1))
            else:
                if last_position is not None and position - 1 != last_position:
                    raise ValueError("Missing: {}".format(position - 1))

            key = keys[0]
            track = data["tracks"][key]
            artist = track["artiest"]
            title = track["titel"]

            extra_text = "\xE2\x88\xB4" # therefore sign
            if previous_year in track:
                previous_position = int(track[previous_year])
                diff = abs(position - previous_position)
                if position < previous_position:
                    #extra_text = "\xE2\x86\x91{}".format(diff) # upwards arrow
                    extra_text = "\xE2\xAC\x86{}".format(diff) # upwards arrow
                elif position > previous_position:
                    #extra_text = "\xE2\x86\x93{}".format(diff) # downwards arrow
                    extra_text = "\xE2\xAC\x87{}".format(diff) # upwards arrow
                else:
                    extra_text = "\xE2\x87\x84" # left right arrow
            else:
                for year in range(current_year-2, first_year-1, -1):
                    if str(year) in track and track[str(year)] != "0":
                        #if current_year - year - 1 <= 1:
                        #    extra_text = "\xE2\x9F\xB3" * (current_year - year 
                        #    - 1)
                        #else:
                        extra_text = "\xE2\x9F\xB3{}".format(year) # rotation
                        #extra_text = "\xE2\x86\xBA{}".format(year) # rotation
                        break

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
            #if "2017" not in track and "2016" not in track and "2015" not in track and "2014" not in track and ("jaar" not in track or track["jaar"] != str(current_year)) #and position > 1773:
            if "2017" not in track and ("2016" in track or "2015" in track or "2014" in track) and ("jaar" not in track or track["jaar"] != str(current_year)): #and position > 1773:
            #if 'jaar' not in track:
                #pass
                lines += 1
                print(line)

            if reverse:
                page_position = (len(positions) - position + 1) % (rows_per_page * columns_per_page)
            else:
                page_position = position % (rows_per_page * columns_per_page)

            if columns_per_page > 1 and (page_position == 0 or page_position > rows_per_page):
                if reverse:
                    last_row = (len(positions) - last_position + 1) % rows_per_page
                else:
                    last_row = last_position % rows_per_page
                rows[last_row].extend(row)
            else:
                rows.append(row)

            if page_position == 0:
                #print('WRITE')
                writer.writerows(rows)
                rows = []

            last_position = position

        if rows:
            writer.writerows(rows)


    print('{} lines above are indication of fixes that may need to be applied.'.format(lines))

if __name__ == "__main__":
    main(sys.argv[1:])
