"""
Wikipedia API parsed HTML reader.
"""

import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.parse import quote, urljoin
from urllib.request import urlopen
from .base import Base, Key, Row, ExtraPositions, ExtraData, FieldMap
from ..normalization import Normalizer

RowLinks = dict[str, dict[str, str]]

class WikiHTMLParser(HTMLParser):
    """
    Parser of wiki table with chart data.
    """

    TAGS = {'tr', 'th', 'td'}
    CELL_TAGS = {'a', 'span'}

    def reset(self) -> None:
        super().reset()
        self._headers: list[str] = []
        self._rows: list[Row] = []
        self._row = 0
        self._column = 0
        self._state: str | None = None
        self._links: list[RowLinks] = []
        self._title: str | None = None

    @property
    def rows(self) -> list[Row]:
        """
        Retrieve the parsed rows.
        """

        return self._rows

    @property
    def links(self) -> list[RowLinks]:
        """
        Retrieve links in the parsed rows for each track.
        """

        return self._links

    def handle_starttag(self, tag: str,
                        attrs: list[tuple[str, str | None]]) -> None:
        if tag in self.TAGS:
            self._state = tag
        elif tag in self.CELL_TAGS and self._state is not None:
            attributes = dict(attrs)
            if tag == 'span' and "style" in attributes:
                self._state = f"{self._state}/hidden"
                return

            self._state = f"{self._state}/{tag}"
            if tag == 'a' and self._headers:
                self._title = str(attributes["title"])
        if tag == 'tr':
            self._rows.append({})
            self._links.append({})

    def handle_endtag(self, tag: str) -> None:
        if tag == 'tr':
            self._row += 1
            self._column = 0
        elif tag == 'td':
            self._column += 1
        if tag in self.TAGS:
            self._state = None
        elif tag in self.CELL_TAGS and self._state is not None:
            self._state = "/".join(self._state.split("/")[:-1])

    def handle_data(self, data: str) -> None:
        if self._state == 'td/hidden':
            return

        data = data.strip("\n")
        if self._state == 'th':
            if data.isnumeric() and len(data) == 2:
                data = "1999" if data == "99" else f"20{data}"
            self._headers.append(data)
        elif self._state is not None and self._state.startswith('td') and \
                self._headers and data not in {"\u2014", "\u00d7"}:
            row = self._rows[self._row]
            column = self._headers[self._column]
            row[column] = f"{row.get(column, "")}{data}"
            if self._title is not None:
                self._links[self._row].setdefault(column, {})
                self._links[self._row][column][self._title] = data
                self._title = None

@Base.register("wiki")
class Wiki(Base):
    """
    Read Wikipedia page for list of Radio 2 Top 2000s with a table of charts
    from different years.
    """

    @property
    def input_format(self) -> str | None:
        return "wiki"

    def _get_api_url(self) -> str:
        api = self._get_str_field("api", "https://nl.wikipedia.org/w/api.php")
        oldid = self._get_int_field("oldid")
        if oldid == 0:
            page = self._get_str_field("page", "Lijst_van_Radio_2-Top_2000's")
            page_query = f"page={quote(page)}"
        else:
            page_query = f"oldid={oldid}"

        return f"{api}?action=parse&{page_query}&format=json"

    def _get_hash(self) -> str:
        url = self._get_api_url()
        algo = hashlib.sha256()
        algo.update(url.encode("utf-8"))
        return algo.hexdigest()

    def _read_http(self) -> str:
        with urlopen(self._get_api_url()) as request:
            data = json.load(request)
            if "error" in data:
                raise RuntimeError(data["error"]["info"])
            return data["parse"]["text"]["*"]

    def reset(self) -> None:
        super().reset()
        self._artist_links: ExtraPositions = []

    def read(self) -> None:
        path = Path(f"wiki{self._get_hash()}.html")
        if path.exists():
            with path.open("r", encoding="utf-8") as wiki_file:
                html = wiki_file.read()
        else:
            html = self._read_http()
            with path.open("w", encoding="utf-8") as wiki_file:
                wiki_file.write(html)

        parser = WikiHTMLParser()
        parser.feed(html)
        fields = {
            "pos": str(int(self._year)),
            "artist": self._get_str_field("artist", "Artiest"),
            "title": self._get_str_field("title", "Titel"),
            "year": self._get_str_field("year", "Jaar")
        }
        for row, links in zip(parser.rows[1:], parser.links[1:]):
            try:
                best_key, position = self._read_row(row, fields)
                if best_key is not None and position is not None:
                    self._fill_links(best_key, position, fields, links)
            except KeyError as error:
                raise KeyError(f"Could not parse row: {row}") from error

    def _fill_links(self, best_key: Key, position: int, fields: FieldMap,
                    links: RowLinks) -> None:
        if title_links := links.get(fields["title"], {}):
            self._tracks[best_key]["title_link"] = title_links.popitem()[0]

        if position != len(self._artist_links) + 1:
            raise ValueError(f"{position} != {len(self._artist_links) + 1}")

        artist_links: Row = {}
        normalizer = Normalizer.get_instance()
        for link, artist in links.get(fields["artist"], {}).items():
            artist_links[link] = normalizer.find_artist_alternatives(artist)[-1]
        self._artist_links.append(artist_links)

    @property
    def extra_data(self) -> dict[str, ExtraData]:
        return {
            "artist_links": self._artist_links,
            "wiki_url": urljoin(self._get_api_url(),
                                self._get_str_field("path", "/wiki/"))
        }

    def _update_best_key(self, best_key: Key, row: Row,
                         artist_alternatives: list[str],
                         title_alternatives: list[str]) -> tuple[Key, bool]:
        old_current_year = self._is_current_year
        self._is_current_year = True
        best_key, valid = self._update_row(best_key, row, str(int(self._year)),
                                           best_key)
        self._is_current_year = old_current_year
        if self._is_current_year and not valid:
            # Collision was detected
            best_key = (artist_alternatives[-1].lower(),
                        title_alternatives[-1].lower())
            self._tracks[best_key] = row
            self._tracks[best_key]["artiest"] = artist_alternatives[-1]
            self._tracks[best_key]["titel"] = title_alternatives[-1]
            return best_key, True

        return best_key, False

    def select_relevant_keys(self, relevant_keys: dict[tuple[int, ...], Key],
                             position: int, keys: list[Key],
                             primary: Base | None = None) -> None:
        if primary is None:
            primary = self
        if primary is self:
            super().select_relevant_keys(relevant_keys, position, keys,
                                         primary=primary)

        wiki_keys: dict[tuple[int, ...], Key] = {}
        for title in self._artist_links[position - 1].values():
            key = (str(title).lower(), keys[0][1])
            chart = tuple(primary.artists.get(key[0], []))
            if chart:
                if chart in wiki_keys:
                    wiki_keys[(-1, hash(key[0]))] = key
                else:
                    wiki_keys[chart] = key

        #if "het is een nacht" in keys[0][1]:
        #    print(position, relevant_keys, wiki_keys, keys)
        relevant_keys.update(wiki_keys)
