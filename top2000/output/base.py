"""
Base settings-based output format.
"""

from pathlib import Path
import tomllib
from ..readers.base import Base as ReaderBase, Key, Positions

Setting = int | bool | dict[str, str]

class Format:
    """
    Output formatter.
    """

    def __init__(self, first_year: float, current_year: float) -> None:
        self._first_year = int(first_year)
        self._current_year = int(current_year)
        with Path("output.toml").open("rb") as settings_file:
            settings: dict[str, dict[str, dict[str, Setting]]] = \
                tomllib.load(settings_file)
            self._settings = settings.get(self.format, {})

        self.reset()

    @property
    def format(self) -> str:
        """
        Retrieve the format name as used in the output settings.
        """

        raise NotImplementedError("Must be defined by subclasses")

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

    def output_file(self, data: ReaderBase, output_format: str,
                    path: Path | None = None) -> bool:
        """
        Output a formatted file based on positions and associated track data.
        """

        raise NotImplementedError("Must be implemented by subclasses")

    def _sort_positions(self, positions: Positions,
                        reverse: bool = False) -> list[tuple[int, list[Key]]]:
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
