"""Application logging configuration.

The active log file name is always ``<prefix>-YYYYMMDD.log``; a new file is
opened automatically at local midnight, so yesterday's file is left untouched
on disk.
"""

from __future__ import annotations

import logging
import re
import sys
from datetime import date, datetime
from pathlib import Path

from trinox_bff.core.settings import LoggingConfig, Settings


class DailyFileHandler(logging.Handler):
    """Logging handler that writes to ``<prefix>-YYYYMMDD.log`` and rolls daily.

    Unlike :class:`logging.handlers.TimedRotatingFileHandler`, the current
    day's file name contains the date directly (no rename at midnight).
    """

    _FILENAME_RE = re.compile(r"^(?P<prefix>.+)-(?P<date>\d{8})\.log$")

    def __init__(
        self,
        directory: str | Path,
        prefix: str = "app",
        encoding: str = "utf-8",
        retention_days: int = 0,
    ) -> None:
        super().__init__()
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True)
        self.prefix = prefix
        self.encoding = encoding
        self.retention_days = retention_days
        self._current_date: date | None = None
        self._stream = None  # type: ignore[assignment]
        self._open_for(datetime.now().date())

    def _filename_for(self, d: date) -> Path:
        return self.directory / f"{self.prefix}-{d.strftime('%Y%m%d')}.log"

    def _open_for(self, d: date) -> None:
        if self._stream is not None:
            try:
                self._stream.flush()
                self._stream.close()
            except Exception:
                pass
        self._current_date = d
        self._stream = open(self._filename_for(d), "a", encoding=self.encoding)
        self._prune()

    def _prune(self) -> None:
        if self.retention_days <= 0:
            return
        today = datetime.now().date()
        for entry in self.directory.iterdir():
            if not entry.is_file():
                continue
            m = self._FILENAME_RE.match(entry.name)
            if not m or m.group("prefix") != self.prefix:
                continue
            try:
                d = datetime.strptime(m.group("date"), "%Y%m%d").date()
            except ValueError:
                continue
            if (today - d).days > self.retention_days:
                try:
                    entry.unlink()
                except OSError:
                    pass

    def emit(self, record: logging.LogRecord) -> None:
        try:
            now = datetime.now().date()
            if self._current_date != now or self._stream is None:
                self._open_for(now)
            msg = self.format(record)
            assert self._stream is not None
            self._stream.write(msg + "\n")
            self._stream.flush()
        except Exception:
            self.handleError(record)

    def close(self) -> None:
        try:
            if self._stream is not None:
                self._stream.flush()
                self._stream.close()
                self._stream = None
        finally:
            super().close()


def configure_logging(settings: Settings) -> None:
    cfg: LoggingConfig = settings.logging
    log_dir = settings.resolve(cfg.directory)

    root = logging.getLogger()
    # Remove existing handlers so repeated calls (reload, tests) are idempotent.
    for h in list(root.handlers):
        root.removeHandler(h)
        try:
            h.close()
        except Exception:
            pass

    level = getattr(logging, cfg.level.upper(), logging.INFO)
    root.setLevel(level)

    formatter = logging.Formatter(fmt=cfg.format, datefmt=cfg.date_format)

    file_handler = DailyFileHandler(
        directory=log_dir,
        prefix=cfg.filename_prefix,
        retention_days=cfg.retention_days,
    )
    file_handler.setLevel(level)
    file_handler.setFormatter(formatter)
    root.addHandler(file_handler)

    if cfg.console:
        stream = logging.StreamHandler(sys.stdout)
        stream.setLevel(level)
        stream.setFormatter(formatter)
        root.addHandler(stream)

    # Quiet down noisy libraries unless explicitly raised.
    for name in ("uvicorn.access", "httpx", "apscheduler"):
        logging.getLogger(name).setLevel(max(level, logging.INFO))

    logging.getLogger("trinox").info(
        "Logging initialized: dir=%s prefix=%s level=%s console=%s retention=%dd",
        log_dir,
        cfg.filename_prefix,
        cfg.level,
        cfg.console,
        cfg.retention_days,
    )
