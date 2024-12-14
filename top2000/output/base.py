"""
Base settings-based output format.
"""

from collections.abc import Callable, Sequence
from pathlib import Path
import tomllib
from ..readers.base import Base as ReaderBase, Key, Positions, Artists

Setting = int | bool | dict[str, str]
KeyPair = tuple[int, list[Key]]

class Format:
    """
    Output formatter.
    """

    _formats: dict[str, type['Format']] = {}
    _keys: dict[type['Format'], str] = {}
    _output_settings: dict[str, dict[str, dict[str, Setting]]] | None = None

    @classmethod
    def register(cls, name: str) -> Callable[[type['Format']], type['Format']]:
        """
        Register an output format by its settings key.
        """

        def decorator(subclass: type['Format']) -> type['Format']:
            cls._formats[name] = subclass
            cls._keys[subclass] = name
            return subclass

        return decorator

    @classmethod
    def get_format(cls, name: str) -> type['Format']:
        """
        Retrieve a format class by its name.
        """

        return cls._formats[name]

    @classmethod
    def _load_settings(cls) -> dict[str, dict[str, Setting]]:
        if cls._output_settings is None:
            with Path("output.toml").open("rb") as settings_file:
                cls._output_settings = tomllib.load(settings_file)
        return cls._output_settings.get(cls._keys[cls], {})

    def __init__(self, first_year: float, current_year: float) -> None:
        self._first_year = int(first_year)
        self._current_year = int(current_year)
        self._settings = self._load_settings()

        self.reset()

    @property
    def output_names(self) -> tuple[str, ...]:
        """
        Retrieve the output names relevant for this format.
        """

        return tuple(self._settings.keys())

    def _get_int_setting(self, output_format: str, key: str,
                         default: int = 0) -> int:
        setting = self._settings.get(output_format, {}).get(key, default)
        assert isinstance(setting, int), f"{key} must be an integer"
        return setting

    def _get_bool_setting(self, output_format: str, key: str,
                          default: bool = False) -> bool:
        setting = self._settings.get(output_format, {}).get(key, default)
        assert isinstance(setting, bool), f"{key} must be a boolean"
        return setting

    def _get_dict_setting(self, output_format: str, key: str) -> dict[str, str]:
        setting = self._settings.get(output_format, {}).get(key, {})
        assert isinstance(setting, dict), f"{key} must be a mapping"
        return setting

    def reset(self) -> None:
        """
        Reset current output format state.

        Subclasses may call this whenever they want to set variables to initial
        state, and extend with more variables to reset.
        """

        self._last_position: int | None = None

    def output_file(self, readers: list[ReaderBase], output_format: str,
                    path: Path | None = None) -> bool:
        """
        Output a formatted file based on positions and associated track data
        from potentially multiple readers.
        """

        raise NotImplementedError("Must be implemented by subclasses")

    def _sort_positions(self, positions: Positions,
                        reverse: bool = False) -> list[KeyPair]:
        return sorted(positions.items(),
                      key=lambda pair: -pair[0] if reverse else pair[0])

    def _check_position(self, position: int, reverse: bool = False) -> None:
        if self._last_position is not None:
            if reverse:
                if position + 1 != self._last_position:
                    raise ValueError(f"Missing: {position + 1}")
            else:
                if position - 1 != self._last_position:
                    raise ValueError(f"Missing: {position - 1}")

        self._last_position = position

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
