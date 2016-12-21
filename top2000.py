from collections import OrderedDict
import csv
import itertools
import sys

def find_alternatives(text):
    alternatives = set()
    removes = [
        ",", "!", "?", "?!", "'",
        "The ", "De ", " Experience", " Groep", " Group", " Theme", " (live)"
    ]

    for remove in removes:
        alternative = text.replace(remove, "")
        if alternative != text:
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
        "Suite Judy Blue Eyes": "Suite: Judy Blue Eyes",
        "Rendezvous 6:02": "Rendez-Vous 6:02"
    }
    if title in fixes:
        return [fixes[title]]

    return list(find_alternatives(title)) + [title]

def find_artist_alternatives(artist):
    alternatives = OrderedDict()
    splits = [" & ", " Feat. ", " feat. ", " ft. "]
    replaces = {
        " Feat. ": " ft. ",
        "Pink": "P!nk",
        "Edith": "\xC3\x89dith",
        "Charly": "Charlie",
        "The Jimi Hendrix Experience": "Jimi Hendrix"
    }
    full_replaces = {
        "One Republic": "OneRepublic",
        "PHD": "Ph.D.",
        "Run D.M.C.": "Run-D.M.C.",
        "Andre Hazes": "Andr\xC3\xA9 Hazes",
        "Trockener Kecks": "Tr\xC3\xB6ckener Kecks"
    }
    for split in splits:
        alternative = artist.split(split)[0]
        if alternative != artist:
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

def read_csv_file(csv_name, data, pos_field="pos 2016",
                  artist_field="artiest", title_field="titel"):
    positions = {}
    with open(csv_name, 'r') as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            artist_alternatives = find_artist_alternatives(row[artist_field])
            title_alternatives = find_title_alternatives(row[title_field])
            best_key = None
            key = None
            for artist, title in itertools.product(artist_alternatives, title_alternatives):
                key = "{}-{}".format(artist.lower().strip(), title.lower().strip())
                if key in data:
                    data[key].update(row)
                    best_key = key
                else:
                    data[key] = row

            if best_key is None:
                best_key = key # original artist/title combination

            if pos_field in row:
                position = int(row[pos_field])
                positions[position] = best_key

    return positions

def main(argv):
    first_year = 1999
    csv_name_format = "TOP-2000-{}.csv"
    current_year = int(argv[0]) if len(argv) > 0 else 2016
    previous_year = str(current_year - 1)
    current_year_csv_name = argv[1] if len(argv) > 1 else csv_name_format.format(current_year)
    overview_csv_names = argv[2:] if len(argv) > 2 else [
        csv_name_format.format(year) for year in ("2014", "2015")
    ]

    data = {}
    positions = read_csv_file(current_year_csv_name, data)
    for overview_csv_name in overview_csv_names:
        read_csv_file(overview_csv_name, data)

    columns_per_page = 2
    rows_per_page = 100
    header = ["nr.", "artiest", "titel", "jaar"] * columns_per_page
    with open("output.csv", "w") as output_file:
        writer = csv.writer(output_file)
        writer.writerow(header)
        rows = []
        for position, key in sorted(positions.items(), key=lambda p: p[0]):
            track = data[key]
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
                        extra_text = "\xE2\x9F\xB3" * (current_year - year - 1) # rotation
                        #extra_text = "\xE2\x86\xBA{}".format(year) # rotation
                        break

            row = [position, artist, "{} ({})".format(title, extra_text), track["jaar"]]
            #writer.writerow(row)

            line = "{}. {} - {} - {} ({})".format(position, artist, title, track["jaar"], extra_text)
            #if "2015" not in track and track["jaar"] != "2016" and "2014" not in track:
            print(line)

            page_position = position % (rows_per_page * columns_per_page)
            if page_position == 0 or page_position > rows_per_page:
                rows[(position - 1) % rows_per_page].extend(row)
            else:
                rows.append(row)

            if page_position == 0:
                writer.writerows(rows)
                rows = []

        if rows:
            writer.writerows(rows)

if __name__ == "__main__":
    main(sys.argv[1:])
