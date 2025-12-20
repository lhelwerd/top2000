"""
Logging of parsing handling.
"""

import logging
import re
from logging.config import dictConfig
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
        level: int = logging.DEBUG,
    ) -> None:
        """
        Track information when a field matches a search pattern.
        """

        if self.isEnabledFor(level):
            match search:
                case str(_):
                    hit = field in search
                case tuple(_):
                    hit = any(field in part for part in search)
                case re.Pattern():
                    hit = search.search(field) is not None
            if hit:
                self._log(level, "%s: %r", (field, context))


dictConfig(
    {
        "version": 1,
        "formatters": {
            "generic_dated": {
                "format": (
                    "%(asctime)s %(levelname)-5.5s [%(name)s] %(message)s"
                ),
                "datefmt": "%Y-%m-%d %H:%M:%S",
            }
        },
        "handlers": {
            "stderr": {
                "class": "logging.StreamHandler",
                "formatter": "generic_dated",
                "stream": "ext://sys.stderr",
                "level": "INFO",
            }
        },
        "loggers": {"top2000": {"level": "INFO", "handlers": ["stderr"]}},
    }
)

LOGGER = Logger("top2000", logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(
    logging.Formatter(
        fmt="%(asctime)s %(levelname)-5.5s [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
)
LOGGER.addHandler(handler)
