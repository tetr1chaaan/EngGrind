"""First-run configuration for the local EngGrind bot."""

from getpass import getpass
from pathlib import Path
from urllib.parse import urlparse

ENV_FILE = Path(__file__).resolve().parent / ".env"


def read_existing() -> dict[str, str]:
    values: dict[str, str] = {}
    if not ENV_FILE.exists():
        return values
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def main() -> None:
    values = read_existing()
    if values.get("BOT_TOKEN"):
        print(f"Bot token is configured in {ENV_FILE}.")
    else:
        print("First launch setup: enter the Telegram bot token from BotFather.")
        token = getpass("Bot token (input hidden): ").strip()
        if not token:
            raise SystemExit("A bot token is required. Run `npm run setup` to try again.")
        values["BOT_TOKEN"] = token

    configured_url = values.get("WEB_APP_URL", "").strip().rstrip("/")
    parsed_url = urlparse(configured_url)
    url_is_configured = (
        parsed_url.scheme == "https"
        and bool(parsed_url.hostname)
        and not parsed_url.hostname.endswith(".example")
    )
    if url_is_configured:
        print(f"Mini App URL is configured: {values['WEB_APP_URL']}")
    else:
        url = input("Mini App HTTPS URL (for example, your HTTPS tunnel URL): ").strip().rstrip("/")
        parsed_url = urlparse(url)
        if parsed_url.scheme != "https" or not parsed_url.hostname or parsed_url.hostname.endswith(".example"):
            raise SystemExit("Enter a real Mini App URL beginning with https://. Run `npm run setup` to try again.")
        values["WEB_APP_URL"] = url

    ENV_FILE.parent.mkdir(parents=True, exist_ok=True)
    ENV_FILE.write_text(
        "# Local configuration; do not commit this file.\n"
        + "".join(f"{key}={value}\n" for key, value in values.items())
    )
    ENV_FILE.chmod(0o600)
    print(f"Configuration saved to {ENV_FILE}.")


if __name__ == "__main__":
    main()
