"""
Artist and song track title normalization and alternative key generation.
"""

import re
import tomllib
from pathlib import Path
from typing import Literal


class Normalizer:
    """
    Normalization and alternative formats of artist and title names.
    """

    _instance: "Normalizer | None" = None

    @classmethod
    def get_instance(cls) -> "Normalizer":
        """
        Retrieve the normalizer singleton.
        """

        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self) -> None:
        with Path("fixes.toml").open("rb") as fixes_file:
            self._fixes: dict[str, dict[str, list[str] | dict[str, str]]] = (
                tomllib.load(fixes_file)
            )

        self._replaces = str.maketrans(self._get_mapping("replaces"))
        artist_splits = "|".join(
            re.escape(split) for split in self._get_list("artist_splits")
        )
        self._artist_splits = re.compile(f"({artist_splits})")

    def _get_list(self, name: str) -> list[str]:
        items = self._fixes[name]["items"]
        assert isinstance(items, list), f"{name} is a list"
        return items

    def _get_mapping(self, name: str) -> dict[str, str]:
        mapping = self._fixes[name]["items"]
        assert isinstance(mapping, dict), f"{name} must be a dict"
        return mapping

    def find_alternatives(self, text: str) -> set[str]:
        """
        Find alternative names that could have been used in earlier years or
        external data instead of the exact string in `text`, which is either an
        artitst or title.
        """

        alternatives = {
            text.replace(remove, "")
            for remove in self._get_list("removes")
            if remove in text
        }
        alternatives.add(text.translate(self._replaces))
        alternatives.discard(text)

        return alternatives

    def find_title_alternatives(self, title: str) -> list[str]:
        """
        Find alternative titles for the `title` that could be used in earlier
        years or external data. The returned list includes the preferred title
        as last argument.
        """

        title = title.translate(self._replaces)

        title_fixes = self._get_mapping("title_fixes")
        if title in title_fixes:
            return [title_fixes[title]]

        alternatives = list(self.find_alternatives(title))
        if " (" in title:
            prefix = title.split(" (")[0]
            if prefix in title_fixes:
                return [title_fixes[prefix]]
            alternatives.append(prefix)
        if title.startswith("("):
            alternatives.extend((
                title.replace("(", "").replace(")", ""),
                title.split(") ")[-1],
            ))

        alternatives.append(title)
        return alternatives

    def check_album_version(self, title: str) -> str:
        """
        Check if the title has an album version indicator and adjust the title
        if this is the case.
        """

        if (
            "(" in title
            and ")" in title
            and any(part in title for part in self._get_list("album_version"))
        ):
            replaces = self._get_mapping("album_version_replaces")
            for search, replace in replaces.items():
                title = title.replace(search, replace)

        return title

    def find_artist_splits(
        self, artist: str
    ) -> tuple[dict[str, Literal[True]], int]:
        """
        Find separate artists in a potential group of musicians listed in the
        string `artist`. The returned dictionary contains the splits names as
        keys in order of finding them. This function should not be used on
        artists of which it is known that they should not be split up. The
        second return value provides a count of splits found.
        """

        alternatives: dict[str, Literal[True]] = {}
        parts = self._artist_splits.split(artist)
        split_count = len(parts[::2]) - 1
        if split_count == 0:
            return alternatives, split_count

        keep = self._get_list("artist_no_splits")
        for index, part in enumerate(parts[::2]):
            two = index * 2
            if index > 0 and f"{parts[two - 2]}{parts[two - 1]}{part}" in keep:
                alternatives[f"{parts[two - 2]}{parts[two - 1]}{part}"] = True
                split_count -= 1
                continue
            if (
                index < split_count
                and f"{part}{parts[two + 1]}{parts[two + 2]}" in keep
            ):
                alternatives[f"{part}{parts[two + 1]}{parts[two + 2]}"] = True
                split_count -= 1
                continue
            alternatives[part] = True
            alternatives.update(
                dict.fromkeys(self.find_alternatives(part), True)
            )
        alternative = "".join(parts[::-1])
        alternatives[alternative] = True

        return alternatives, split_count

    def find_artist_alternatives(self, artist: str) -> list[str]:
        """
        Find alternative names for an artist which may be used in earlier years
        or external data, as well as a normalized version for the `artist`,
        which may or may not contain groups of artists. The returned list
        includes the preferred artist name as the last element.
        """

        artist = artist.translate(self._replaces)

        if artist in self._get_list("artist_no_splits"):
            # Do not generate any splits
            return [artist]

        alternatives, split_count = self.find_artist_splits(artist)

        for search, group in self._get_mapping("artist_groups").items():
            if search in artist:
                alternatives[group] = True

        for find, split in self._get_mapping("artist_split_replaces").items():
            if find in artist:
                artist = artist.replace(find, split)
                alternatives[artist] = True

        for search, replace in self._get_mapping("artist_replaces").items():
            if search in artist:
                artist = artist.replace(search, replace)
                alternatives[artist] = True
                alternatives[replace] = True

        for alternative in self.find_alternatives(artist):
            alternatives[alternative] = True

        artist_full_replaces = self._get_mapping("artist_full_replaces")
        old_artist = artist
        artist = artist_full_replaces.get(artist, artist)
        if artist != old_artist and split_count == 0:
            alternatives.update(self.find_artist_splits(artist)[0])
        # Ensure normal key is last
        alternatives.pop(artist, None)
        alternatives[artist] = True

        return list(alternatives.keys())
