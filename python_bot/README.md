# Teqemach Python Telegram Bot

A Python 3 bot for Teqemach providing Telegram Bot commands, verified payment status lookup, account linking, contact verification, and Mini App launching.

## Features
- **`/start`**: Launches Teqemach Mini App, supports deep-link account linking (`/start link_<id>`).
- **`/mycontribution` & `/verify`**: Checks active contributions, total amount contributed, and verified payment status from Supabase.
- **`/profile`**: Displays user role, verified status, and linked phone.
- **Phone Contact Verification**: Saves and verifies user phone numbers in Supabase.
- **Zero Heavy Dependencies**: Uses standard Python 3 standard library `urllib` / `json` (or optional `python-dotenv`).

## Quick Start

```bash
# Run the Python Bot
python3 python_bot/bot.py
```
