"""
Logging of parsing handling.
"""

import logging
import re
from typing import Protocol

from typing_extensions import override


class Representable(Protocol):
    """
    An object that can be represented as a string.
    """

    @override
    def __repr__(self) -> str: ...


class Logger(logging.Logger):
    """
    Logging interface.
    """

    def track(
        self,
        field: str,
        search: str | tuple[str, ...] | re.Pattern[str],
        *context: Representable | None,
    ) -> None:
        """
        Track information when a field matches a search pattern.
        """

        if self.isEnabledFor(logging.DEBUG):
            match search:
                case str(_):
                    hit = field in search
                case tuple(_):
                    hit = any(field in part for part in search)
                case re.Pattern():
                    hit = search.search(field) is not None
            if hit:
                self.debug("%s: %r", field, context)


LOGGER = Logger(__name__)
