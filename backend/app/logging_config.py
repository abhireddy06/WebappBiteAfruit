import logging
from logging.config import dictConfig

from app.config import settings


def configure_logging() -> None:
    level = settings.log_level.upper()
    dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(asctime)s %(levelname)s [%(name)s] %(message)s",
                },
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "default",
                },
            },
            "root": {
                "handlers": ["console"],
                "level": level,
            },
            "loggers": {
                "botocore": {"level": "WARNING"},
                "boto3": {"level": "WARNING"},
                "s3transfer": {"level": "WARNING"},
                "urllib3": {"level": "WARNING"},
            },
        }
    )
    logging.getLogger(__name__).info("Logging configured", extra={"log_level": level})
