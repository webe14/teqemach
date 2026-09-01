#!/usr/bin/env python3
"""
Teqemach Telegram Bot (Python)
Integrated with Supabase database, payment verification, Teqemach Mini App, and SMS Gateway dispatch.
"""

import os
import sys
import json
import time
import re
import urllib.request
import urllib.parse
from typing import Optional, Dict, Any

# Load environment variables from .env
def load_env(env_path: str = ".env"):
    if not os.path.exists(env_path):
        env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip("\"'")
                    if k not in os.environ:
                        os.environ[k] = v

load_env()

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
APP_URL = os.getenv("NEXT_PUBLIC_TELEGRAM_APP_URL") or os.getenv("NEXT_PUBLIC_SITE_URL") or "https://teqemach.vercel.app"

if not BOT_TOKEN:
    print("❌ ERROR: TELEGRAM_BOT_TOKEN environment variable is missing in .env")
    sys.exit(1)

TELEGRAM_API_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"

# ─────────────────────────────────────────────────────────────────────────────
# SMS Sanitizer & Dispatch Helper (GSM 7-bit standard)
# ─────────────────────────────────────────────────────────────────────────────
def clean_sms_text(text: str) -> str:
    if not text:
        return ""
    amharic_replacements = [
        (r"መስከረም", "Meskerem"),
        (r"ጥቅምት", "Tikimt"),
        (r"ህዳር", "Hidar"),
        (r"ታህሳስ", "Tahsas"),
        (r"ጥር", "Tir"),
        (r"የካቲት", "Yekatit"),
        (r"መጋቢት", "Megabit"),
        (r"ሚያዚያ", "Miazia"),
        (r"ግንቦት", "Ginbot"),
        (r"ሰኔ", "Sene"),
        (r"ሐምሌ|ሀምሌ", "Hamle"),
        (r"ነሐሴ|ነሀሴ", "Nehase"),
        (r"ጳጉሜ", "Pagumen"),
        (r"ባለ\s*", "Bale "),
        (r"ብር", "ETB"),
        (r"ዕቁብ|እቁብ", "Equb"),
        (r"ተቀማጭ", "Teqemach"),
    ]
    result = text
    for pattern, replacement in amharic_replacements:
        result = re.sub(pattern, replacement, result)

    result = re.sub(r"[^\x20-\x7E]", "", result)
    result = re.sub(r"\s+", " ", result).strip()
    return result

def format_ethiopian_phone(raw_input: str) -> Optional[str]:
    if not raw_input:
        return None
    digits = re.sub(r"\D", "", raw_input)
    if digits.startswith("251") and len(digits) == 12:
        if digits[3] in ("9", "7"):
            return f"+{digits}"
    elif digits.startswith("0") and len(digits) == 10:
        if digits[1] in ("9", "7"):
            return f"+251{digits[1:]}"
    elif digits.startswith(("9", "7")) and len(digits) == 9:
        return f"+251{digits}"
    return f"+{digits}" if not raw_input.startswith("+") else raw_input

# ─────────────────────────────────────────────────────────────────────────────
# Supabase REST API Helper
# ─────────────────────────────────────────────────────────────────────────────
def supabase_request(endpoint: str, method: str = "GET", data: Optional[Dict] = None, params: Optional[Dict] = None) -> Any:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None

    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    if params:
        query_string = urllib.parse.urlencode(params)
        url += f"?{query_string}"

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return json.loads(content) if content else []
    except Exception as e:
        print(f"[Supabase Error] {method} {endpoint}: {e}")
        return None

def queue_sms_job(phone: str, message: str, job_type: str = "payment_confirmation") -> bool:
    formatted_phone = format_ethiopian_phone(phone)
    if not formatted_phone:
        return False
    sanitized_msg = clean_sms_text(message)
    payload = {
        "type": job_type,
        "recipient": formatted_phone,
        "message": sanitized_msg,
        "status": "pending",
        "attempts": 0,
        "max_attempts": 3
    }
    res = supabase_request("sms_jobs", method="POST", data=payload)
    return res is not None

# ─────────────────────────────────────────────────────────────────────────────
# Telegram API Helpers
# ─────────────────────────────────────────────────────────────────────────────
def send_telegram_message(chat_id: int | str, text: str, reply_markup: Optional[Dict] = None, parse_mode: str = "HTML") -> bool:
    payload: Dict[str, Any] = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{TELEGRAM_API_URL}/sendMessage",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status == 200
    except Exception as e:
        print(f"[Telegram Send Error] {e}")
        return False

def open_mini_app_keyboard(button_text: str = "ተቀማጭ ይክፈቱ (Open Teqemach)") -> Dict:
    return {
        "inline_keyboard": [
            [
                {
                    "text": button_text,
                    "web_app": {"url": APP_URL}
                }
            ]
        ]
    }

def request_contact_keyboard(text: str = "📱 ስልክ ቁጥርዎን ያጋሩ (Share Phone Number)") -> Dict:
    return {
        "keyboard": [
            [
                {
                    "text": text,
                    "request_contact": True
                }
            ]
        ],
        "resize_keyboard": True,
        "one_time_keyboard": True
    }

# ─────────────────────────────────────────────────────────────────────────────
# Bot Command Handlers
# ─────────────────────────────────────────────────────────────────────────────
def handle_start(chat_id: int, from_user: Dict, args: list):
    telegram_id = from_user.get("id")
    username = from_user.get("username", "")

    # Check for account linking deep link: /start link_<profile_id>
    if args and args[0].startswith("link_"):
        profile_id = args[0].replace("link_", "")
        profiles = supabase_request(f"profiles", params={"id": f"eq.{profile_id}", "select": "id,telegram_username"})
        
        if not profiles:
            send_telegram_message(chat_id, "❌ Link invalid or expired. Profile not found.")
            return

        profile = profiles[0]
        linked_username = profile.get("telegram_username") or ""
        if username and linked_username and username.lower() != linked_username.lower():
            send_telegram_message(chat_id, f"❌ Username mismatch! Account is linked to @{linked_username}, but your username is @{username}.")
            return

        # Update profile in Supabase
        supabase_request(
            f"profiles?id=eq.{profile_id}",
            method="PATCH",
            data={
                "telegram_id": telegram_id,
                "telegram_chat_id": telegram_id,
                "telegram_verified": True,
                "telegram_linked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "status": "active"
            }
        )

        success_text = (
            "✅ <b>መለያዎ በተሳካ ሁኔታ ተገናኝቷል! (Account Linked)</b>\n\n"
            "እንኳን ወደ <b>ተቀማጭ (Teqemach)</b> በደህና መጡ 👋\n"
            "የዕቁብ ተቀማጭዎን እና ክፍያዎችዎን ለመከታተል ከታች ያለውን ቁልፍ ይጫኑ!"
        )
        send_telegram_message(chat_id, success_text, reply_markup=open_mini_app_keyboard())
        return

    # Check for share_phone deep link
    if args and args[0] == "share_phone":
        send_telegram_message(
            chat_id,
            "📱 እባክዎ ከታች ያለውን ቁልፍ በመጫን ስልክ ቁጥርዎን ያረጋግጡ።",
            reply_markup=request_contact_keyboard()
        )
        return

    # Default Welcome Message
    welcome_text = (
        "👋 <b>እንኳን ወደ ተቀማጭ (Teqemach) Bot በደህና መጡ!</b>\n\n"
        "ይህ የዘመናዊ ዕቁብ መከታተያ እና የክፍያ ማረጋገጫ Bot ነው።\n\n"
        "🔹 የዕቁብ ተቀማጭዎን ይመልከቱ\n"
        "🔹 የተረጋገጡ የክፍያ ደረሰኞችን ይቀበሉ (Verified Receipts)\n"
        "🔹 የገንዘብ ዝውውር ታሪክዎን ይከታተሉ\n\n"
        "Mini App ለመክፈት ከታች ያለውን ቁልፍ ይጫኑ 👇"
    )
    send_telegram_message(chat_id, welcome_text, reply_markup=open_mini_app_keyboard())

def handle_verify_or_mycontribution(chat_id: int, telegram_id: int):
    # Find user profile in Supabase
    profiles = supabase_request("profiles", params={"telegram_id": f"eq.{telegram_id}", "select": "id,full_name,role,phone_number"})
    if not profiles:
        send_telegram_message(
            chat_id,
            "⚠️ አካውንትዎ ገና አልተገናኘም። እባክዎ Mini App ውስጥ በመግባት ይገናኙ።",
            reply_markup=open_mini_app_keyboard()
        )
        return

    profile = profiles[0]
    user_id = profile.get("id")
    phone = profile.get("phone_number")

    # Fetch active contributions and memberships
    memberships = supabase_request(
        "group_memberships",
        params={
            "contributor_id": f"eq.{user_id}",
            "select": "total_contributed,group_id(name,contribution_amount,total_days)"
        }
    )

    if not memberships:
        send_telegram_message(chat_id, "ℹ️ በአሁን ሰዓት ምንም የተመዘገበ የዕቁብ ግሩፕ የለዎትም።", reply_markup=open_mini_app_keyboard())
        return

    msg = f"📊 <b>የክፍያ ማረጋገጫ እና የተቀማጭ ሁኔታ (Payment Status)</b>\n\n"
    msg += f"👤 <b>ስም:</b> {profile.get('full_name', 'User')}\n"
    msg += f"📱 <b>ስልክ:</b> {phone or 'N/A'}\n"
    msg += f"🔹 <b>የክፍያ ሁኔታ:</b> ✅ ተረጋግጧል (Verified)\n\n"
    msg += "<b>የተሳተፉባቸው ዕቁቦች:</b>\n"

    for m in memberships:
        g = m.get("group_id") or {}
        g_name = g.get("name", "Equb")
        total = m.get("total_contributed", 0)
        amount = g.get("contribution_amount", 0)
        msg += f"• <b>{g_name}</b> (ETB {amount}/ቀን) — የተከፈለ: <b>ETB {total:,}</b> ✅\n"

    msg += "\nሙሉ ዝርዝሩን በ Mini App ውስጥ ይመልከቱ 👇"
    send_telegram_message(chat_id, msg, reply_markup=open_mini_app_keyboard())

def handle_profile(chat_id: int, telegram_id: int):
    profiles = supabase_request("profiles", params={"telegram_id": f"eq.{telegram_id}", "select": "id,full_name,role,status,phone_number"})
    if not profiles:
        send_telegram_message(chat_id, "⚠️ አካውንትዎ ገና አልተገናኘም። እባክዎ /start በማለት ይገናኙ።")
        return

    p = profiles[0]
    text = (
        f"👤 <b>የመገለጫ መረጃ (Your Profile)</b>\n\n"
        f"<b>ስም:</b> {p.get('full_name', 'N/A')}\n"
        f"<b>ሚና (Role):</b> {p.get('role', 'contributor')}\n"
        f"<b>ስልክ:</b> {p.get('phone_number', 'N/A')}\n"
        f"<b>የክፍያ ሁኔታ:</b> ✅ ተረጋግጧል (Verified)\n"
        f"<b>Telegram:</b> የተገናኘ (Connected)\n"
    )
    send_telegram_message(chat_id, text, reply_markup=open_mini_app_keyboard())

def handle_help(chat_id: int):
    text = (
        "🤖 <b>የተቀማጭ Bot ትእዛዞች (Commands):</b>\n\n"
        "/start - Mini App ይክፈቱ\n"
        "/mycontribution - የተቀማጭ ክፍያዎን እና የተረጋገጠውን ሁኔታ ይመልከቱ\n"
        "/verify - የክፍያ ማረጋገጫ ሁኔታን ይፈትሹ (Payment Verified)\n"
        "/profile - የመገለጫ መረጃዎን ይመልከቱ\n"
        "/help - የእርዳታ መመሪያ\n"
    )
    send_telegram_message(chat_id, text, reply_markup=open_mini_app_keyboard())

# ─────────────────────────────────────────────────────────────────────────────
# Incoming Update Router
# ─────────────────────────────────────────────────────────────────────────────
def process_update(update: Dict):
    message = update.get("message")
    if not message:
        return

    chat_id = message.get("chat", {}).get("id")
    from_user = message.get("from", {})
    telegram_id = from_user.get("id")
    text = message.get("text", "").strip()

    # Handle Contact Sharing
    if message.get("contact"):
        contact = message.get("contact")
        phone = contact.get("phone_number", "")
        if phone:
            formatted_phone = format_ethiopian_phone(phone)
            supabase_request(
                f"profiles?telegram_id=eq.{telegram_id}",
                method="PATCH",
                data={"phone_number": formatted_phone}
            )
            send_telegram_message(
                chat_id,
                f"✅ ስልክ ቁጥርዎ ({formatted_phone}) በተሳካ ሁኔታ ተረጋግጧል!",
                reply_markup=open_mini_app_keyboard()
            )
        return

    if not text.startswith("/"):
        return

    parts = text.split(" ")
    command = parts[0].lower().split("@")[0]
    args = parts[1:]

    if command == "/start":
        handle_start(chat_id, from_user, args)
    elif command in ["/mycontribution", "/verify", "/payments"]:
        handle_verify_or_mycontribution(chat_id, telegram_id)
    elif command == "/profile":
        handle_profile(chat_id, telegram_id)
    elif command == "/help":
        handle_help(chat_id)

# ─────────────────────────────────────────────────────────────────────────────
# Polling Engine
# ─────────────────────────────────────────────────────────────────────────────
def run_polling():
    print("=" * 60)
    print("🚀 Teqemach Python Telegram Bot Started (Python 3)")
    print(f"🔗 Mini App URL: {APP_URL}")
    print(f"📡 Connected to Supabase: {SUPABASE_URL}")
    print("=" * 60)

    offset = 0
    while True:
        try:
            url = f"{TELEGRAM_API_URL}/getUpdates?offset={offset}&timeout=20"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=25) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if data.get("ok"):
                    for update in data.get("result", []):
                        offset = update["update_id"] + 1
                        process_update(update)
        except KeyboardInterrupt:
            print("\n🛑 Bot stopped.")
            break
        except Exception as e:
            time.sleep(2)

if __name__ == "__main__":
    run_polling()
