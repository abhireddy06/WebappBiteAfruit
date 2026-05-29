import logging

from botocore.exceptions import NoCredentialsError, PartialCredentialsError

from app.config import settings
from app.excel_db import store
from app.logging_config import configure_logging


configure_logging()
logger = logging.getLogger(__name__)


def run() -> None:
    try:
        logger.info("Seed script started", extra={"excel_storage": "s3" if store.s3_enabled() else "local", "s3_uri": store.s3_uri()})
        store.seed(force=True)
        store.sync_to_s3()
    except (NoCredentialsError, PartialCredentialsError) as exc:
        logger.exception("Seed script failed because AWS credentials were missing or partial")
        raise SystemExit(
            "AWS S3 is configured, but boto3 could not find valid AWS credentials. "
            "Run `aws configure`, set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY, "
            "or use an AWS profile before running the seed script."
        ) from exc
    except RuntimeError as exc:
        logger.exception("Seed script failed")
        raise SystemExit(str(exc)) from exc

    s3_uri = store.s3_uri()
    if s3_uri:
        logger.info("Seed script completed", extra={"s3_uri": s3_uri})
        print(f"Excel database created/updated at {s3_uri}")
    else:
        logger.info("Seed script completed", extra={"path": settings.excel_database_path})
        print(f"Excel database ready at {settings.excel_database_path}")
    print("Admin: admin@biteafruit.com / password123")
    print("Customer: customer@biteafruit.com / password123")
    print("Delivery: delivery@biteafruit.com / password123")


if __name__ == "__main__":
    run()
