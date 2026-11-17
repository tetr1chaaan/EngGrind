import hashlib
import hmac
import json
import time
from urllib.parse import parse_qsl


def validate_init_data(init_data: str, bot_token: str) -> dict[str, str] | None:
    fields = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = fields.pop("hash", None)
    if not received_hash or not bot_token:
        return None

    try:
        auth_date = int(fields["auth_date"])
    except (KeyError, ValueError):
        return None
    now = int(time.time())
    if auth_date > now + 30 or now - auth_date > 86400:
        return None

    check_string = "\n".join(f"{key}={value}" for key, value in sorted(fields.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    expected_hash = hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(received_hash, expected_hash):
        return None
    return fields


def user_from_init_data(fields: dict[str, str]) -> dict[str, object] | None:
    try:
        user = json.loads(fields["user"])
    except (KeyError, json.JSONDecodeError, TypeError):
        return None
    if not isinstance(user, dict) or not isinstance(user.get("id"), int) or not user.get("first_name"):
        return None
    return user
