"""
Artist and song track title normalization and alternative key generation.
"""

from collections import OrderedDict

removes = [
    ",", "!", "?", "?!", "'",
    "The ", "De ", " Experience", " Groep", " Group", " Theme", " Edit"
]

title_fixes = {
    "The Man Who Sold The World (MTV Unplugged)": "The Man Who Sold The World (unplugged)",
    "Lolo Montez": "Lola Montez",
    # No split (to avoid counting with Lola)
    "Lola (Live)": "Lola (Live)",
    "Lola (live)": "Lola (live)",
    "Somebody Will Know Somebody": "Somebody Will Know Someday",
    "Don't Stand To Close To Me": "Don't Stand So Close To Me",
    #"Read All About It": "Read All About It, Pt. 1", # See Part 3
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
    "It's A Man's Man's  Man's World": "It's A Man's Man's Man's World",
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
    "Sgt Pepper's Lonely Hearts Club Band": "Sgt. Pepper's Lonely Hearts Club Band",
    "Don't Stop Till You Get Enough": "Don't Stop 'til You Get Enough",
    "Zwart-Wit": "Zwart Wit",
    "Waiting On A Sunny Day": "Waitin' On A Sunny Day",
    "Wanted (Dead Or Alive)": "Wanted Dead Or Alive",
    "Father And Friend": "Father & Friend",
    "Candle In The Wind (1997)": "Candle In The Wind",
    "Candle In The Wind '97": "Candle In The Wind",
    "Candle In The Wind 1997": "Candle In The Wind",
    "Land Van Maas En Waal": "Het Land Van Maas En Waal",
    "Jumping Jack Flash": "Jumpin' Jack Flash",
    "Oh Well!": "Oh Well (Part 1)",
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
    "Killer / Papa Was A Rollin' Stone": "Killer/Papa Was A Rollin' Stone",
    "Like A Rollin' Stone": "Like A Rolling Stone",
    "Kristallnaach": "Kristallnach",
    "You Never Walk Alone": "You'll Never Walk Alone", # Gerry / Lee
    "Nightboat To Cairo": "Night Boat To Cairo",
    "He Ain't Heavy, He's My Brother": "He Ain't Heavy... He's My Brother",
    "Comptine D'Un Autre \u00c9t\u00e9: L'Apr\u00e8s-Midi (Am\u00e9lie)": \
        "Comptine D'un Autre \u00c9t\u00e9: L'Apr\u00e8s-Midi",
    "Comptine D'un Autre \u00c9t\u00e9": \
        "Comptine D'un Autre \u00c9t\u00e9: L'Apr\u00e8s-Midi",
    "Comptine D'un Autre Ete, L'Apres Midi (Amelie)": \
        "Comptine D'un Autre \u00c9t\u00e9: L'Apr\u00e8s-Midi",
    "Comptine D'un Autre Ete, L'apres Midi (Amelie)": \
        "Comptine D'un Autre \u00c9t\u00e9: L'Apr\u00e8s-Midi",
    "Comptine D'un Autre \u00c9te, L'apres Midi (Amelie)": \
        "Comptine D'un Autre \u00c9t\u00e9: L'Apr\u00e8s-Midi",
    "Comptine D'un Autre \u00c9t\u00e9, L'Apres Midi (Amelie)": \
        "Comptine D'un Autre \u00c9t\u00e9: L'Apr\u00e8s-Midi",
    "Il Est Cinq Heures Paris s'\u00c9veille": \
        "Il Est Cinq Heures Paris S'\u00c9veille",
    "Heart Shaped Box": "Heart-Shaped Box",
    "Rock 'N' Roll": "Rock And Roll",
    "Tous Les Memes": "Tous Les M\u00eames",
    "I Love You Like Myself": "I Love You Like I Love Myself",
    "Sex Machine": "Get Up (I Feel Like Being a) Sex Machine",
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
    # Sad attempt at self-censorship
    ".. In Paris": "Niggas In Paris",
    "..In Paris": "Niggas In Paris",
    "Het Is Een Nacht": "Het Is Een Nacht... (Levensecht)",
    "Het Is Een Nacht (Levensecht)": "Het Is Een Nacht... (Levensecht)",
    "Het Is Een Nacht (Levensecht...)": "Het Is Een Nacht... (Levensecht)",
    "I Was Made For Loving You": "I Was Made For Lovin' You",
    "Long Cool Woman In A Black Dress": "Long Cool Woman (In A Black Dress)",
    "Pak Maar Mijn Hand": "Pak Maar M'n Hand",
    "Voila": "Voil\u00e0",
    "THE LONELIEST": "The Loneliest",
    "Peaceful Easy Feelin'": "Peaceful Easy Feeling",
    "Een Nacht Alleen": "1 Nacht Alleen",
    "Oxygene IV": "Oxyg\u00e8ne IV"
}

# No splits are made for these groups, i.e. the combining characters are seen
# as part of the group name. Avoids some weirdness like Nick & Simon getting
# tracks from Simon & Garfunkel, or incorrect combining character replacements
# Crosby, Stills & Nash (& Young)? are often considered together
artist_no_splits = [
    "Simon & Garfunkel", "Earth & Fire", "Earth, Wind & Fire",
    "Crosby, Stills, Nash & Young", "Florence + The Machine",
    "Emerson, Lake & Palmer"
]
artist_splits = [
    " & ", " Feat. ", " feat. ", " ft ", " ft. ", " Ft. ", ", ", " And ",
    " en ", " x ", "  ", "vs. "
]
artist_replaces = {
    " en ": " & ",
    " + ": " & ",
    ", ": " & ",
    " x ": " & ",
    #"/": " & ",
    " \u039b ": " And ", # Lambda
    " Feat. ": " ft. ",
    #"Pink": "P!nk",
    "Jay Z": "Jay-Z",
    " Vs ": " vs. ",
    " vs ": " vs. ",
    "Edith": "\u00c9dith",
    #"Charly": "Charlie",
    "BB King": "B.B. King",
    "The Jimi Hendrix Experience": "Jimi Hendrix",
    "Earth Wind & Fire": "Earth, Wind & Fire",
    "Santana Ft. Rob Thomas": "Santana & Rob Thomas",
    "Sinead O'Connor": "Sin\u00e9ad O'Connor",
    "Daniel Lohues": "Dani\u00ebl Lohues",
    "Gilbert Becaud": "Gilbert B\u00e9caud",
    "Andre van Duin": "Andr\u00e9 van Duin",
    "Rene Froger": "Ren\u00e9 Froger",
    "Bokkers": "B\u00f6kkers",
    "BL\u00d8F": "Bl\u00f8f",
    "Olivia Newton John": "Olivia Newton-John",
}
# Full artists that have their tracks merged with the other group, but this
# does not lead to replacements
artist_groups = {
    "Earth Wind & Fire": "Earth, Wind & Fire",
    "Earth, Wind & Fire & The Emotions": "Earth, Wind & Fire",
    "Jay Z": "Jay-Z",
    "Pharrell": "Pharrell Williams",
    "Golden Earrings": "Golden Earring",
    "Thomas Acda, Paul de Munnik, Maan & Typhoon": "Acda & de Munnik & Maan & Typhoon",
    "Delerium ft. Sarah McLachlan": "Ti\u00ebsto" # Remix
}
# Artists which are not adjusted in collaborations
# Some could be moved to artist_replaces
artist_full_replaces = {
    "One Republic": "OneRepublic",
    "Blue Oyster Cult": "Blue \u00d6yster Cult",
    "PHD": "Ph.D.",
    "Boney M": "Boney M.",
    "Run D.M.C.": "Run-D.M.C.",
    "Run DMC & Aerosmith": "Run-D.M.C.",
    "Andre Hazes": "Andr\u00e9 Hazes",
    "Andre Hazes Jr.": "Andr\u00e9 Hazes Jr.",
    "Trockener Kecks": "Tr\u00f6ckener Kecks",
    "Herbert Gronemeyer": "Herbert Gr\u00f6nemeyer",
    "Neet Oet Lottum": "Neet O\u00e9t Lottum",
    "Bachman Turner Overdrive": "Bachman-Turner Overdrive",
    "DJ Tiesto": "Ti\u00ebsto",
    "DJ Ti\u00ebsto": "Ti\u00ebsto",
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
    "Iggy Pop & Kate Pierson": "Iggy Pop ft. Kate Pierson",
    "Hollies": "The Hollies",
    "JJ Cale": "J.J. Cale",
    "Frans Halsema  Jenny Arean": "Frans Halsema ft. Jenny Arean",
    "Frans Halsema & Jenny Arean": "Frans Halsema ft. Jenny Arean",
    "Anouk ft Douwe Bob": "Anouk & Douwe Bob",
    "tom petty and the heartbreakers": "Tom Petty And The Heartbreakers",
    "Tom Petty & The Heartbreakers": "Tom Petty And The Heartbreakers",
    "Paul McCartney & Frog Chorus": "Paul McCartney & The Frog Chorus",
    "Paul McCartney And The Frog Chorus": "Paul McCartney & The Frog Chorus",
    "Communards & Sarah Jane Morris": "Communards ft. Sarah Jane Morris",
    "Communards With Sarah Jane Morris": "Communards ft. Sarah Jane Morris",
    "Boudewijn de Groot En Elly Nieman": "Boudewijn de Groot",
    "Dr Hook & The Medicine Show": "Dr. Hook & The Medicine Show",
    "Dr Hook and The Medicine Show": "Dr. Hook & The Medicine Show",
    "Hans de Booy": "Hans de Booij",
    "Hans De Booij": "Hans de Booij",
    "RUN DMC": "Run-D.M.C.",
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
    "Earth, Wind & Fire & The Emotions": "Earth, Wind & Fire ft. The Emotions",
    "Earth & Wind & Fire & The Emotions": "Earth, Wind & Fire ft. The Emotions",
    "Edith Piaf": "\u00c9dith Piaf",
    "Armin van Buuren ft.Trevor Guthrie": "Armin van Buuren ft. Trevor Guthrie",
    "Swedish House Mafia ft.The Weeknd": "Swedish House Mafia ft. The Weeknd",
    "Ronde": "Rond\u00e9",
    "Maneskin": "M\u00e5neskin",
    "Silk Sonic (Bruno Mars & Anderson .Paak)": "Silk Sonic",
    "Silk Sonic (Bruno Mars & Anderson .Paak )": "Silk Sonic",
    "Motorhead": "Mot\u00f6rhead",
    "DI-RECT": "Di-rect",
    "Bob Marley/The Wailers": "Bob Marley & The Wailers",
    #"Elvis": "Elvis Presley",
    "Elvis Vs JXL": "Elvis Presley vs. Junkie XL",
    "Elvis vs JXL": "Elvis Presley vs. Junkie XL",
    "Elvis vs. JXL": "Elvis Presley vs. Junkie XL"
}

def find_alternatives(text):
    """
    Find alternative names that could be used in earlier years instead of the
    exact string in `text`, which is either an artitst or title.
    """

    alternatives = set(text.replace(remove, "") for remove in removes
                       if remove in text)

    # Non-breaking space
    if "\u00a0" in text:
        alternatives.add(text.replace("\u00a0", " "))

    # Curly quote (closing)
    if "\u2019" in text:
        alternatives.add(text.replace("\u2019", "'"))

    return alternatives

def find_title_alternatives(title):
    """
    Find alternative titles for the `title` that could be used in earlier
    years. The returned list includes the preferred title as last argument.
    """

    # Byte order mark, non-breaking space, curly quote
    title = title.replace("\ufeff", "").replace("\u00a0", " ").replace("\u2019", "'")

    if title in title_fixes:
        return [title_fixes[title]]

    alternatives = list(find_alternatives(title))
    if " (" in title:
        prefix = title.split(" (")[0]
        if prefix in title_fixes:
            return [title_fixes[prefix]]
        alternatives.append(prefix)
    if title.startswith("("):
        alternatives.append(title.replace("(", "").replace(")", ""))
        alternatives.append(title.split(") ")[-1])

    alternatives.append(title)
    return alternatives

def find_artist_splits(artist):
    """
    Find separate artists in a potential group of musicians listed in the string
    `artist`. The returned dictionary contains the splits names as keys in order
    of finding them. This function should not be used on artists of which it is
    known that they should not be split up. The second return value provides a
    count of splits found.
    """

    alternatives = OrderedDict()
    split_count = 0
    for split in artist_splits:
        if split in artist:
            split_count += 1
            parts = artist.split(split)
            alternatives.update(OrderedDict.fromkeys(parts, True))
            alternative = split.join(parts[::-1])
            alternatives[alternative] = True

    return alternatives, split_count

def find_artist_alternatives(artist):
    """
    Find alternative artists which may have data on the titles of the `artist`
    in earlier years. The returned list includes the preferred artist name as
    the last element.
    """

    # Byte order mark
    if "\ufeff" in artist:
        artist = artist.replace("\ufeff", "")
    # Non-breaking space
    if "\u00a0" in artist:
        artist = artist.replace("\u00a0", " ")
    # Curly quote
    if "\u2019" in artist:
        artist = artist.replace("\u2019", "'")

    if artist in artist_no_splits:
        # Do not generate any splits
        return [artist]

    alternatives, split_count = find_artist_splits(artist)

    for search, group in artist_groups.items():
        if search in artist:
            alternatives[group] = True

    for search, replace in artist_replaces.items():
        #print(artist, search, replace)
        artist = artist.replace(search, replace)
        alternatives[artist] = True

    #alternatives.update(dict.fromkeys(find_alternatives(artist), True))
    for alternative in find_alternatives(artist):
        alternatives[alternative] = True

    if artist in artist_full_replaces:
        artist = artist_full_replaces[artist]
        if split_count == 0:
            alternatives.update(find_artist_splits(artist)[0])
    # Ensure normal key is last
    alternatives.pop(artist, None)
    alternatives[artist] = True

    return list(alternatives.keys())
