from collections import OrderedDict
import bisect
import csv
import itertools
import json
import os.path
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
    "Living On A Prayer": "Livin' On A Prayer",
    "Born In The USA": "Born In The U.S.A.",
    "Born In The Usa": "Born In The U.S.A.",
    "Slowdancing In A Burning Room": "Slow Dancing In A Burning Room",
    "The Times Are A-Changing": "The Times They Are A-Changin'",
    "The Times They Are A-Changing": "The Times They Are A-Changin'",
    "The Times They Are A Changin'": "The Times They Are A-Changin'",
    "Musica E": "Musica \u00c8",
    "Musica \u00c9": "Musica \u00c8",
    "Musica \u00e9": "Musica \u00c8",
    "Con Te Partiro": "Con Te Partir\u00f2",
    "Belgie": "Belgi\u00eb (Is Er Leven Op Pluto\u2026?)",
    "Unforgiven": "The Unforgiven",
    "True Colors": "True Colours",
    "Wake Me Up Before You Gogo": "Wake Me Up Before You Go-Go",
    "Wake Me Up Before You Go Go": "Wake Me Up Before You Go-Go",
    "Une Belle Histoire (Een Mooi Verhaal)": "Une Belle Histoire / Een Mooi Verhaal",
    "Une Belle Histoire/Een Mooi Verhaal": "Une Belle Histoire / Een Mooi Verhaal",
    "It's A Man's Man's World": "It's A Man's Man's Man's World",
    "My Heart Will Go On (Love Theme From 'Tittanic')": "My Heart Will Go On",
    "Het Land Van...": "Het Land Van\u2026",
    "Het Land Van": "Het Land Van\u2026",
    "Its The End Of The World": "It's The End Of The World As We Know It (And I Feel Fine)",
    "Ouverture": "Overture",
    "One Love/People Get Ready": "One Love / People Get Ready",
    "One Love - People Get Ready": "One Love / People Get Ready",
    "If There's Something": "If There Is Something",
    "The Sun Always Shines On TV": "The Sun Always Shines On T.V.",
    "Hotel Lounge": "Hotellounge",
    "Wer Bisto": "W\u00ear Bisto",
    "Crying": "Cryin'",
    "Paloma Blanca": "Una Paloma Blanca",
    "Ik Heb Je Lief": "'k Heb Je Lief",
    "Ain't Got No - I Got Life": "Ain't Got No, I Got Life",
    "Ain't Got No, I Got Life (Original)": "Ain't Got No, I Got Life",
    "Non Non Rien N'a Chang\u00e9": "Non, Non, Rien N'a Chang\u00e9",
    "Somebody To Love (Live)": "Somebody To Love (Live)",
    "Gotta Catch 'M All (Pokemon Theme Song)": "Gotta Catch 'Em All",
    "Killing In The Name Of": "Killing In The Name",
    "Knocking On Heaven's Door": "Knockin' On Heaven's Door",
    "Knockin On Heaven's Door": "Knockin' On Heaven's Door",
    "Sad Man\u00b4s Tongue": "Sad Man's Tongue",
    "She's Always A Woman To Me": "She's Always A Woman",
    "Nothing Compares 2u": "Nothing Compares 2 U",
    "I Am...I Said": "I Am... I Said",
    "Sinds 1 Dag Of 2 (32 Jaar)": "32 Jaar (Sinds 1 Dag Of 2)",
    "Laat Me (Vivre)": "Laat Me / Vivre",
    "Laat Me/Vivre": "Laat Me / Vivre",
    "The Load Out/Stay": "The Load Out / Stay",
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
    "Nur Getraumt": "Nur Getr\u00e4umt",
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
    "Empire State Of Mind (part II) Broken Down": "Empire State Of Mind (Part 2)",
    "Empire State Of Mind (Part II) Broken Down": "Empire State Of Mind (Part 2)",
    "Empire State Of Mind (part II)": "Empire State Of Mind (Part 2)",
    "Empire State Of Mind (part 2)": "Empire State Of Mind (Part 2)",
    "When I'm Sixty Four": "When I'm Sixty-Four",
    "GROUNDS FOR DIVORCE": "Grounds For Divorce",
    "Feel Good Inc": "Feel Good Inc.",
    "American Trilogy": "An American Trilogy",
    "Anarchy In The Uk": "Anarchy In The U.K.",
    "Can't Help Falling In Love With You": "Can't Help Falling In Love",
    "Joan Of Arc (Maid Of Orleans)": "Maid Of Orleans",
    "Papa Was A Rolling Stone": "Papa Was A Rollin' Stone",
    "Like A Rollin' Stone": "Like A Rolling Stone",
    "Kristallnaach": "Kristallnach",
    "Oh Well (Part I)": "Oh Well",
    "Oh Well!": "Oh Well",
    "You Never Walk Alone": "You'll Never Walk Alone", # Gerry / Lee
    "Nightboat To Cairo": "Night Boat To Cairo",
    "He Ain't Heavy, He's My Brother": "He Ain't Heavy... He's My Brother",
    "Comptine D'Un Autre \u00c9t\u00e9: L'Apr\u00e8s-Midi (Am\u00e9lie)": "Comptine D'un Autre \u00c9t\u00e9: L'Apr\u00e8s-Midi",
    "Comptine D'un Autre \u00c9t\u00e9": "Comptine D'un Autre \u00c9t\u00e9: L'Apr\u00e8s-Midi",
    "Comptine D'un Autre Ete, L'Apres Midi (Amelie)": "Comptine D'un Autre \u00c9t\u00e9: L'Apr\u00e8s-Midi",
    "Heart Shaped Box": "Heart-Shaped Box",
    "Rock 'N' Roll": "Rock And Roll",
    "Tous Les Memes": "Tous Les M\u00eames",
    "I Love You Like Myself": "I Love You Like I Love Myself",
    "Sex Machine": "Get Up (I Feel Like Being a) Sex Machine",
    "It's A Man's Man's World": "It's A Man's Man's Man's World",
    "It's A Man's Man's  Man's World": "It's A Man's Man's Man's World",
    "You Make Lovin' Fun": "You Make Loving Fun",
    "Intro/Sweet Jane": "Sweet Jane",
    "High And Dry": "High & Dry",
    "ENGEL": "Engel",
    "LAVENDER": "Lavender",
    "GLYCERINE": "Glycerine",
    "HOME BY THE SEA": "Home By The Sea",
    "ROOSTER": "Rooster",
    "NOVOCAINE FOR THE SOUL": "Novocaine For The Soul",
    "HEY BOY HEY GIRL": "Hey Boy Hey Girl",
    "bad guy": "Bad Guy",
    "Dear Mr President": "Dear Mr. President",
    "Bloasmuziek": "Blaosmuziek",
    "PANAMA": "Panama",
    "HOT FOR TEACHER": "Hot For Teacher",
    "AMERIKA": "Amerika",
    "CIVIL WAR": "Civil War",
    "EPIC": "Epic",
    "Belle Helene": "Belle H\u00e9l\u00e8ne",
    "Ob La Di, Ob La Da": "Ob-La-Di, Ob-La-Da",
    "Venise (Elle Voulait Qu'on L'Appelle)": "Elle Voulait Qu'on l'Appelle Venise",
    "Good Old Fashioned Boy": "Good Old-Fashioned Lover Boy",
    ".. In Paris": "Niggas In Paris", # Zielige poging tot zelfcensuur
    "Het Is Een Nacht": "Het Is Een Nacht... (Levensecht)",
    "Het Is Een Nacht (Levensecht)": "Het Is Een Nacht... (Levensecht)",
    "Het Is Een Nacht (Levensecht...)": "Het Is Een Nacht... (Levensecht)",
    "I Was Made For Loving You": "I Was Made For Lovin' You"
}

# Crosby, Stills & Nash (& Young)? Wordt vaak bij elkaar gerekend
artist_no_splits = ["Simon & Garfunkel", "Earth & Fire", "Earth, Wind & Fire"]
artist_splits = [" & ", " Feat. ", " feat. ", " ft ", " ft. ", " Ft. ", ", ", " And ", "  "]
artist_replaces = {
    " en ": " & ",
    " + ": " & ",
    ", ": " & ",
    " \u039b ": " And ", # Lambda
    " Feat. ": " ft. ",
    "Pink": "P!nk",
    "Jay Z": "Jay-Z",
    " Vs ": " vs. ",
    " vs ": " vs. ",
    "Edith": "\u00c9dith",
    "Charly": "Charlie",
    "The Jimi Hendrix Experience": "Jimi Hendrix",
    "Earth Wind & Fire": "Earth, Wind & Fire",
    "Santana Ft. Rob Thomas": "Santana & Rob Thomas",
    "Sinead O'Connor": "Sin\u00e9ad O'Connor",
    "Daniel Lohues": "Dani\u00ebl Lohues",
    "Gilbert Becaud": "Gilbert B\u00e9caud",
    "Boney M": "Boney M."
}
artist_groups = {
    "Earth Wind & Fire": "Earth, Wind & Fire",
    "Jay Z": "Jay-Z",
    "Pharrell": "Pharrell Williams",
    "Golden Earrings": "Golden Earring"
}
# TODO: Verplaats een aantal artiesten naar artist_replaces zodat ze ook in
# samenwerkingen worden aangepast
artist_full_replaces = {
    "One Republic": "OneRepublic",
    "Blue Oyster Cult": "Blue \u00d6yster Cult",
    "PHD": "Ph.D.",
    "Run D.M.C.": "Run-D.M.C.",
    "Run DMC & Aerosmith": "Run-D.M.C.",
    "Andre Hazes": "Andr\u00e9 Hazes",
    "Andre Hazes Jr.": "Andr\u00e9 Hazes Jr.",
    "Trockener Kecks": "Tr\u00f6ckener Kecks",
    "Herbert Gronemeyer": "Herbert Gr\u00f6nemeyer",
    "Neet Oet Lottum": "Neet O\u00e9t Lottum",
    "Bachman Turner Overdrive": "Bachman-Turner Overdrive",
    "DJ Tiesto": "Ti\u00ebsto",
    "Dj Tiesto": "Ti\u00ebsto",
    "Tiesto": "Ti\u00ebsto",
    "Celine Dion": "C\u00e9line Dion",
    "Jackson 5": "Jackson Five",
    "U2 & Mary J. Blige": "U2 & Mary J Blige",
    "Mary J Blige & U2": "U2 & Mary J Blige",
    "Rene Klijn": "Ren\u00e9 Klijn",
    "Les Poppys": "Poppys",
    "D.C. Lewis": "DC Lewis",
    "The Dave Brubeck Quartet": "Dave Brubeck",
    "Philip Lynott": "Phil Lynott",
    "Pharrel Williams": "Pharrell Williams",
    "10CC": "10cc",
    "BB King": "B.B. King",
    "Zucchero": "Zucchero Fornaciari",
    "Blink 182": "Blink-182",
    "GORILLAZ": "Gorillaz",
    "RAMMSTEIN": "Rammstein",
    "REM": "R.E.M.",
    "Florence And The Machine": "Florence + The Machine",
    "Rowwen Heze": "Rowwen H\u00e8ze",
    "Guns \u00b4N Roses": "Guns N' Roses",
    "Pharrell": "Pharrell Williams",
    "ACDC": "AC/DC",
    "Fischer Z": "Fischer-Z",
    "Nick Cave And The Bad Seeds + Kylie Minogue": "Nick Cave & Kylie Minogue",
    "Herman Brood (& His Wild Romance)": "Herman Brood & His Wild Romance",
    "Chainsmokers & Coldplay": "The Chainsmokers & Coldplay",
    "The Chainsmokers ft Coldplay": "The Chainsmokers & Coldplay",
    "JAY Z ft. Alicia Keys": "Jay-Z & Alicia Keys",
    "Ge Reinders": "G\u00e9 Reinders",
    "Paul Elstak": "DJ Paul Elstak",
    "Iggy Pop & Kate Pierson": "Iggy Pop Ft. Kate Pierson",
    "Hollies": "The Hollies",
    "JJ Cale": "J.J. Cale",
    "Frans Halsema  Jenny Arean": "Frans Halsema Ft. Jenny Arean",
    "Frans Halsema & Jenny Arean": "Frans Halsema Ft. Jenny Arean",
    "Anouk ft Douwe Bob": "Anouk & Douwe Bob",
    "tom petty and the heartbreakers": "Tom Petty And The Heartbreakers",
    "Tom Petty & The Heartbreakers": "Tom Petty And The Heartbreakers",
    "Paul McCartney & Frog Chorus": "Paul McCartney & The Frog Chorus",
    "Paul McCartney And The Frog Chorus": "Paul McCartney & The Frog Chorus",
    "Communards & Sarah Jane Morris": "Communards Ft. Sarah Jane Morris",
    "Communards With Sarah Jane Morris": "Communards Ft. Sarah Jane Morris",
    "Boudewijn de Groot En Elly Nieman": "Boudewijn de Groot",
    "Dr Hook & The Medicine Show": "Dr. Hook And The Medicine Show",
    "Dr Hook and The Medicine Show": "Dr. Hook And The Medicine Show",
    "Hans de Booy": "Hans de Booij",
    "Hans De Booij": "Hans de Booij",
    "RUN DMC": "Run-D.M.C.",
    "BL\u00d8F": "Bl\u00f8f",
    "ALICE IN CHAINS": "Alice In Chains",
    "QUEENS OF THE STONE AGE": "Queens Of The Stone Age",
    "PRODIGY": "Prodigy",
    "BUSH": "Bush",
    "EELS": "Eels",
    "JOHAN": "Johan",
    "The Golden Earrings": "Golden Earrings",
    "": "Lewis Capaldi",
    "Billie Eillish": "Billie Eilish",
    "GUANO APES": "Guano Apes",
    "UGLY KID JOE": "Ugly Kid Joe",
    "CREED": "Creed",
    "Earth Wind & Fire ft. The Emotions": "Earth, Wind & Fire ft. The Emotions",
    "Edith Piaf": "\u00c9dith Piaf",
    "Armin van Buuren ft.Trevor Guthrie": "Armin van Buuren feat. Trevor Guthrie"
}

def find_alternatives(text):
    alternatives = set()

    for remove in removes:
        if remove in text:
            alternative = text.replace(remove, "")
            alternatives.add(alternative)

    # Non-breaking space
    if "\u00a0" in text:
        alternative = text.replace("\u00a0", " ")
        alternatives.add(alternative)

    # Curly quote (closing)
    if "\u2019" in text:
        alternative = text.replace("\u2019", "'")
        alternatives.add(alternative)

    return alternatives

def find_title_alternatives(title):
    # Byte order mark, non-breaking space, curly quote
    title = title.replace("\ufeff", "").replace("\u00a0", " ").replace("\u2019", "'")

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
    # Byte order mark, non-breaking space, curly quote
    artist = artist.replace("\ufeff", "").replace("\u00a0", " ").replace("\u2019", "'")

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

    for search, group in artist_groups.items():
        if search in artist:
            alternatives[group] = True

    for search, replace in artist_replaces.items():
        #print(artist, search, replace)
        alternative = artist.replace(search, replace)
        if alternative != artist:
            alternatives[alternative] = True

    alternatives.update(dict.fromkeys(find_alternatives(artist), True))

    if artist in artist_full_replaces:
        artist = artist_full_replaces[artist]
    # Ensure normal key is last
    alternatives.pop(artist, None)
    alternatives[artist] = True

    return list(alternatives.keys())

def check_collision(key, data, year, pos_field):
    return (year is not None and str(year) in data["tracks"][key]) \
            or (pos_field is not None and (year is None or year in pos_field) \
                and pos_field in data["tracks"][key])

def update_row(key, row, data, year=None, pos_field=None, best_key=None):
    new_row = row.copy()
    if key in data["tracks"]:
        if check_collision(key, data, year, pos_field):
            #print("Potential collision: {!r} {!r} {!r} {!r}".format(key, best_key, row, data["tracks"][key]))
            if pos_field is not None and pos_field in data["tracks"][key]:
                return best_key, False

            if best_key == key or (best_key is None and \
                "best" in data["tracks"][key] and \
                data["tracks"][key]["best"] is not True):
                #print("Collision: {!r} {!r} {!r} {!r}".format(key, best_key, row, data["tracks"][key]))
                data["tracks"][key] = new_row

            return best_key, False

        new_row.update(data["tracks"][key])
        if "best" in new_row:
            best_key = key if new_row["best"] is True else new_row["best"]

    data["tracks"][key] = new_row
    #print(key, data["tracks"][key])
    return best_key, True

def read_csv_file(csv_name, data, year=None, pos_field="pos",
                  artist_field="artiest", title_field="titel"):
    positions = {}
    last_time = None
    with open(csv_name, 'r') as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            last_time = read_row(row, data, positions, year, pos_field,
                                 artist_field, title_field, last_time=last_time)

    return positions

def read_json_file(json_name, data, fields, year=None):
    pos_field = fields.get("pos", "position")
    artist_field = fields.get("artist", "artist")
    title_field = fields.get("title", "title")
    prv_field = fields.get("prv", "lastPosition")

    positions = {}
    last_time = None
    with open(json_name, 'r') as json_file:
        rows = fields["rows"](json.load(json_file))
        for row in rows:
            last_time = read_row(row, data, positions, year, pos_field,
                                 artist_field, title_field, prv_field,
                                 last_time=last_time)

    return positions

def read_row(row, data, positions, year, pos_field, artist_field, title_field,
             prv_field="prv", last_time=None):
    if pos_field in row and row[pos_field] == "":
        # Date/time row, track last_time
        return row[title_field]

    if last_time is not None and year is None:
        row['timestamp'] = last_time
        last_time = None

    artist_alternatives = find_artist_alternatives(row[artist_field])
    title_alternatives = find_title_alternatives(row[title_field])
    best_key = None
    key = None
    if year is not None:
        row.pop(prv_field, None)
        if pos_field in row:
            row[str(year)] = row[pos_field]

    keys = set()
    rejected_keys = set()
    for artist, title in itertools.product(artist_alternatives, title_alternatives):
        key = (artist.lower().strip(), title.lower().strip())
        best_key, ok = update_row(key, row, data, year, pos_field, best_key)
        if ok:
            keys.add(key)
        else:
            rejected_keys.add(key)

    if best_key is None:
        best_key = key # original artist/title combination

    #if "Gaga" in row[artist_field] and "Shallow" in row[title_field]:
    #   print(year, artist_alternatives, title_alternatives, best_key,
    #         data["tracks"][best_key])
    best_key, ok = update_row(best_key, row, data, best_key=best_key)
    if year is None: # only update to best combination for current year
        data["tracks"][best_key]["artiest"] = artist_alternatives[-1]
        data["tracks"][best_key]["titel"] = title_alternatives[-1]

    keys.discard(best_key)
    for key in keys:
        if data["tracks"][key].get("best") is not True:
            data["tracks"][key]["best"] = best_key

    if pos_field in row:
        position = int(row[pos_field])
        if year is not None:
            data["tracks"][best_key][str(year)] = row[pos_field]

        positions[position] = [best_key] + [key for key in keys if best_key[0].startswith(key[0]) or not any(rejected_key[0].startswith(key[0]) for rejected_key in rejected_keys)]
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

def main(argv):
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
            "rows": lambda data: data["data"][0]
        },
        2020: {
            "artist": "a",
            "title": "s",
            "pos": "pos",
            "prv": "prv",
            "rows": lambda data: data["data"][0]
        },
        2021: {
            # See read_json_file for the defaults
            "rows": lambda data: data["positions"]
        }
    }
    current_year = int(argv[0]) if len(argv) > 0 else 2021
    previous_year = str(current_year - 1)
    current_year_name = argv[1] if len(argv) > 1 else \
        csv_name_format.format(current_year)
        #json_name_format.format(current_year)
    overviews = (argv[2::3], argv[3::3], argv[4::3]) if len(argv) > 3 else [
        (csv_name_format.format(year), json_name_format.format(year), str(year))
        for year in range(first_csv_year, current_year)
    ]

    data = {"artists": {}, "tracks": {}}
    #positions = read_json_file(current_year_name, data, fields[current_year],
    #                           year=None) # Default year
    positions = read_csv_file(current_year_name, data, year=None,
                              pos_field="positie")
    for (overview_csv_name, overview_json_name, year) in overviews:
        if os.path.exists(overview_json_name):
            read_json_file(overview_json_name, data, fields[int(year)],
                           year=year)
        else:
            read_csv_file(overview_csv_name, data, year=year,
                          pos_field="pos {}".format(year))

    columns_per_page = 2
    rows_per_page = 100
    reverse = False
    # Headers sizes for 2 columns, 3 headers: 1,05cm 6,36cm 8,55cm
    # Margins: left, right, top, bottom: 0,30cm 0,30cm 0,90cm 0,30cm
    # Disable print header/footer. Scale factor: 62%
    # Layout -> Print ranges -> Edit -> Repeat rows -> $1
    # Bold first row, right-align first and fourth column
    # Add grey border at (bottom of each row and) between each 3-header column
    header = ["nr.", "artiest", "titel"] * columns_per_page
    with open("output.csv", "w", encoding='utf-8') as output_file:
        writer = csv.writer(output_file)
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
                    raise ValueError("Missing: {}".format(position + 1))
            else:
                if last_position is not None and position - 1 != last_position:
                    raise ValueError("Missing: {}".format(position - 1))

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
                    #extra_text = "\xE2\x86\x91{}".format(diff) # upwards arrow
                    #extra_text = "\u2b06\ufe0e{}".format(diff) # upwards arrow
                    #extra_text = "\u21b0{}".format(diff) # upwards arrow
                    extra_text = "\u219f{}".format(diff) # upwards arrow
                elif position > previous_position:
                    #extra_text = "\xE2\x86\x93{}".format(diff) # downwards arrow
                    #extra_text = "\u2b07\ufe0e{}".format(diff) # downwards arrow
                    #extra_text = "\u21b2{}".format(diff) # downwards arrow
                    extra_text = "\u21a1{}".format(diff) # downwards arrow
                else:
                    extra_text = "\u21c4" # left right arrow
                    #extra_text = "\U0001f51b" # left right arrow
            else:
                for year in range(current_year-2, first_year-1, -1):
                    if str(year) in track and track[str(year)] != "0":
                        #if current_year - year - 1 <= 1:
                        #    extra_text = "\xE2\x9F\xB3" * (current_year - year 
                        #    - 1)
                        #else:
                        #extra_text = "\u27f2{}".format(year) # rotation
                        #extra_text = "\xE2\x86\xBA{}".format(year) # rotation
                        extra_text = "\u21ba{}".format(year) # rotation
                        #extra_text = "\U0001f504{}".format(year) # arrow circle
                        break

            max_artist = 0
            max_artist_key = None
            for possible_key in keys:
                #if track["titel"] == "We All Stand Together":
                #    print(possible_key, max_artist, max_artist_key,
                #          data["artists"].get(possible_key[0]))
                if possible_key[0] not in data["artists"]:
                    continue
                if len(data["artists"][possible_key[0]]) > max_artist:
                    max_artist = len(data["artists"][possible_key[0]])
                    max_artist_key = possible_key[0]

            #artist_key = key[0]
            if max_artist_key in data["artists"]:
                artist_tracks = data["artists"][max_artist_key]
                #print(max_artist_key, artist_tracks)
                artist_pos = artist_tracks.index(position)+1
                #if len(artist_tracks) == artist_pos:
                #    extra_text += " {}".format(artist_pos)
                #else:
                extra_text += " {}/{}".format(artist_pos, len(artist_tracks))

            for title_year_field in ('yr', 'jaar'):
                if title_year_field in track:
                    artist += " ({})".format(track[title_year_field])
                    break
            #if 'timestamp' in track:
            #    parts = track['timestamp'].split(' ')
            #    artist += " {}/12 {:02}:00".format(parts[0], 
            #    int(parts[2].split('-')[0]))
            if 'timestamp' in track and last_timestamp is not None:
                parts = track['timestamp'].split(' ')
                timestamp = " {}/12 {:02}:00".format(parts[0], int(parts[2].split('-')[0]))
                if timestamp != last_timestamp:
                    last_timestamp = timestamp
                    if add_row(rows, ['', timestamp, ''], positions, position,
                               last_position, extra_lines, rows_per_page,
                               columns_per_page, reverse):
                        #print('WRITE')
                        writer.writerows(rows)
                        rows = []
                        extra_lines = 0
                    else:
                        extra_lines += 1

            row = [position, artist, "{} ({})".format(title, extra_text)]
            #writer.writerow(row)

            line = "{}. {} - {} ({})".format(position, artist, title, extra_text)
            prv_field = "lastPosition"
            #if all(str(year) not in track for year in range(first_csv_year, current_year)) and ("jaar" not in track or track["jaar"] != str(current_year)):# and position < 978:
            #if "2018" not in track and "2017" not in track and "2016" not in track and "2015" not in track and "2014" not in track and ("yr" not in track or track["yr"] != str(current_year)): #and position > 1773:
            #if "2018" not in track and ("2017" in track or "2016" in track or "2015" in track) and ("jaar" not in track or track["jaar"] != str(current_year)): #and position > 1773:
            #if "2019" not in track and ("2018" in track or "2017" in track or "2016" in track or "2015" in track) and ("jaar" not in track or track["jaar"] != str(current_year)): #and position > 1773:
            #if 'yr' not in track and 'jaar' not in track:
            #if (artist.isupper() or title.isupper() or artist.islower() or title.islower()) and track["artiest"] not in ("U2", "10cc", "INXS", "KISS", "Q65", "LP", "ABBA", "MGMT", "R.E.M.", "UB40", "3JS", "BAP", "AC/DC"):
                #pass
            #if (prv_field in track and int(track[prv_field]) != int(track.get(previous_year, 0))):
                #lines += 1
                #print(line)
                #print("{} prv={} {}={}".format(line, track[prv_field], previous_year, track.get(previous_year)))
                #print(keys)
                #print(track)

            if add_row(rows, row, positions, position, last_position,
                       extra_lines, rows_per_page, columns_per_page, reverse):
                #print('WRITE')
                writer.writerows(rows)
                rows = []
                extra_lines = 0

            last_position = position #+ extra_lines

        if rows:
            writer.writerows(rows)


    print('{} lines above are indication of fixes that may need to be applied.'.format(lines))

def add_row(rows, row, positions, position, last_position, extra_lines,
            rows_per_page, columns_per_page, reverse):
    if reverse:
        page_position = (len(positions) - position + 1 - extra_lines) % (rows_per_page * columns_per_page)
    else:
        page_position = (position + extra_lines) % (rows_per_page * columns_per_page)

    if columns_per_page > 1 and (page_position == 0 or page_position > rows_per_page):
        if reverse:
            last_row = (len(positions) - last_position + 1) % rows_per_page
        else:
            last_row = last_position % rows_per_page
        rows[last_row].extend(row)
    else:
        rows.append(row)

    return page_position == 0

if __name__ == "__main__":
    main(sys.argv[1:])
