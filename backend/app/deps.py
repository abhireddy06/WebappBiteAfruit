import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.enums import UserRole
from app.excel_db import store
from app.security import decode_token


bearer_scheme = HTTPBearer()
logger = logging.getLogger(__name__)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    payload = decode_token(credentials.credentials)
    if not payload or not payload.get("sub"):
        logger.info("Authorization rejected because token was invalid")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = store.get("users", int(payload["sub"]))
    if not user or not user.get("is_active"):
        logger.info("Authorization rejected because user was missing or inactive", extra={"user_id": payload.get("sub")})
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive or missing user")
    return user


def require_roles(*roles: UserRole):
    allowed = {role.value for role in roles}

    def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role") not in allowed:
            logger.info(
                "Authorization rejected because role was insufficient",
                extra={"user_id": current_user.get("id"), "role": current_user.get("role"), "allowed_roles": sorted(allowed)},
            )
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user

    return role_checker
