#!/usr/bin/env python3
"""
Oath House — content backend.

A single-file, dependency-free server (Python standard library only):
  • Serves the static website (index.html, assets, /admin)
  • SQLite database for editable content (events, experiences, stories)
  • JSON API:  GET /api/content        → published content for the public site
               POST /api/login         → start an admin session
               GET/POST/PUT/DELETE /api/admin/<collection>[/id]  (auth required)
  • Password-protected admin dashboard at /admin

Run it:   python3 server/app.py
Then open http://localhost:8080  (site)  and  http://localhost:8080/admin

First run creates server/oath.db (seeded with the current site content) and
server/config.json (holds the admin password hash + a session secret).
Default admin password: oathhouse  — change it from the admin Settings panel.
"""
import os, json, sqlite3, hashlib, hmac, base64, secrets, time, mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from http.cookies import SimpleCookie
from urllib.parse import urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                       # project root (static site)
# Where persistent data lives (database, admin config, uploaded media).
# In production point DATA_DIR at a mounted disk so it survives restarts/deploys.
DATA_DIR = os.environ.get("DATA_DIR", HERE)
DB   = os.path.join(DATA_DIR, "oath.db")
CONFIG = os.path.join(DATA_DIR, "config.json")
PORT = int(os.environ.get("PORT", "8080"))         # hosts (Render/Railway) set $PORT
HOST = os.environ.get("HOST", "0.0.0.0")           # 0.0.0.0 so the host can route to it
DEFAULT_PASSWORD = os.environ.get("ADMIN_PASSWORD", "oathhouse")
SESSION_HOURS = 12

mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("application/json", ".json")

# ── collections: which DB columns are editable per content type ──────────────
COLLECTIONS = {
    "events":      ["featured","date","day","month","room","title","description","time","published","sort"],
    "experiences": ["key","label","where_txt","party_type","slots","full","classes","published","sort"],
    "stories":     ["featured","category","date","title","excerpt","body","image","link","published","sort"],
    "media":       ["key","label","image","sort"],
    "music":       ["title","artist","src","active","sort"],
    "reservations":["status"],   # admin only flips status; rows are created via /api/reserve
    "instructors": ["name","role","bio","image","specialties","published","sort"],
    "subscribers": [],   # admin can view/remove; rows created via /api/subscribe
}
BOOL_FIELDS = {"featured", "published", "active"}
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
ALLOWED_IMG = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"}
ALLOWED_AUDIO = {".mp3", ".m4a", ".aac", ".wav", ".ogg", ".oga", ".flac"}
ALLOWED_UPLOAD = ALLOWED_IMG | ALLOWED_AUDIO
JSON_FIELDS = {"slots","full","classes"}   # stored as JSON text in SQLite

# ── database ─────────────────────────────────────────────────────────────────
def db():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA journal_mode=WAL")
    return c

def init_db():
    c = db()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      featured INTEGER DEFAULT 0, date TEXT, day TEXT, month TEXT, room TEXT,
      title TEXT, description TEXT, time TEXT, published INTEGER DEFAULT 1, sort INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS experiences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT, label TEXT, where_txt TEXT, party_type TEXT,
      slots TEXT, full TEXT, classes TEXT, published INTEGER DEFAULT 1, sort INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      featured INTEGER DEFAULT 0, category TEXT, date TEXT, title TEXT,
      excerpt TEXT, body TEXT, image TEXT, link TEXT, published INTEGER DEFAULT 1, sort INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE, label TEXT, image TEXT, sort INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS music (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT, artist TEXT, src TEXT, active INTEGER DEFAULT 0, sort INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exp TEXT, exp_label TEXT, date TEXT, time TEXT, party TEXT,
      name TEXT, email TEXT, phone TEXT, notes TEXT,
      status TEXT DEFAULT 'new', created TEXT, sort INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS instructors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT, role TEXT, bio TEXT, image TEXT, specialties TEXT,
      published INTEGER DEFAULT 1, sort INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE, created TEXT, sort INTEGER DEFAULT 0
    );
    """)
    # migrations for databases created before a column existed
    try: c.execute("ALTER TABLE stories ADD COLUMN body TEXT")
    except Exception: pass
    c.commit()
    # seed only when empty, so the site looks identical until the team edits
    if c.execute("SELECT COUNT(*) n FROM events").fetchone()["n"] == 0:
        seed(c)
    if c.execute("SELECT COUNT(*) n FROM media").fetchone()["n"] == 0:
        seed_media(c)
    if c.execute("SELECT COUNT(*) n FROM instructors").fetchone()["n"] == 0:
        seed_instructors(c)
    c.close()

def seed_instructors(c):
    rows = [
        ("Noi Souvannavong", "Breath & Stillness",
         "Noi guides the house's breathwork and sound sessions. Trained between Vientiane and Chiang Mai, she works with the breath as a way back into the body — slow, deliberate, unforced.\n\n"
         "Her mornings open the studio: a guided breath as the first light crosses the floor, and a closing sound bath that lets the week dissolve.",
         "photos/studio/studio-tool.webp", "Breathwork, Sound healing, Meditation", 1, 0),
        ("Maly Phongsavanh", "Slow Flow Yoga",
         "Maly teaches an unhurried vinyasa — long holds, deep breath, the body finding its own pace. Strength through softness, never strain.\n\n"
         "She believes a practice should leave you steadier than it found you, and builds each class around that single idea.",
         "photos/garden/garden-light.webp", "Vinyasa, Mobility, Alignment", 1, 1),
        ("Khampha Inthavong", "Movement & Mobility",
         "Khampha leads the evening movement and mobility sessions — functional, grounded work to release the desk and the day. For bodies that sit too long.\n\n"
         "His sessions are practical and warm: real movement for real people, with room to laugh.",
         "photos/garden/garden-hands.webp", "Mobility, Strength, Recovery", 1, 2),
    ]
    c.executemany("INSERT INTO instructors (name,role,bio,image,specialties,published,sort) VALUES (?,?,?,?,?,?,?)", rows)
    c.commit()

def seed_media(c):
    # named photo "slots" on the site, pointed at the current images. Editing a
    # slot's image swaps that photo everywhere it appears on the site.
    media = [
        ("hero",          "Landing — hero background",   "photos/landing-hero-1600.webp", 0),
        ("garden_gather", "Oath Garden — gathering room","photos/garden/garden-gather.webp", 1),
        ("garden_hands",  "Oath Garden — warmth & texture","photos/garden/garden-hands.webp", 2),
        ("garden_table",  "Oath Garden — the long table","photos/garden/garden-table.webp", 3),
        ("garden_light",  "Oath Garden — morning light", "photos/garden/garden-light.webp", 4),
        ("studio_tool",   "Oath Studio — the studio",    "photos/studio/studio-tool.webp", 5),
    ]
    c.executemany("INSERT INTO media (key,label,image,sort) VALUES (?,?,?,?)", media)
    c.commit()

def seed(c):
    events = [
        (1,"2026-06-21","21","Jun","All three rooms","Solstice — A Night of Gathering",
         "Once a year the whole house opens at once — fire in the garden, records in Papersound, breath in the studio. A single evening where food, sound and movement become one ritual.",
         "Sundown — Late",1,0),
        (0,"2026-06-12","12","Jun","Papersound","Listening Session — Lao Modern",
         "An evening tracing the thread between Lao molam, dub and ambient. Records only. Two sets, one needle.","20:00 — Late",1,1),
        (0,"2026-06-19","19","Jun","Oath Garden","Natural Wine & Long Table",
         "A shared harvest dinner. Low-intervention wine, fire-cooked vegetables, bread torn by hand.","18:30 — 22:00",1,2),
        (0,"2026-06-28","28","Jun","Oath Studio","Breathwork & Sound Bath",
         "A morning of guided breath and resonant tone. Linen, concrete, and the body returning to stillness.","07:30 — 09:00",1,3),
        (0,"2026-07-05","05","Jul","The House","Makers in Residence — Clay",
         "A week-long open studio with a guest ceramicist. Throw, fire, gather. Closing exhibition Sunday.","All week",1,4),
        (0,"2026-07-17","17","Jul","Papersound","Cinema of Sound — Film Night",
         "Moving image and live score under low light. A conversation around the bar afterward.","20:30 — Late",1,5),
    ]
    c.executemany("INSERT INTO events (featured,date,day,month,room,title,description,time,published,sort) VALUES (?,?,?,?,?,?,?,?,?,?)", events)
    experiences = [
        ("table","Table · Oath Garden","Oath Garden","guests",
         json.dumps(["08:00","09:30","11:00","12:30","14:00","18:00","19:30","21:00"]), json.dumps(["12:30"]), json.dumps(None),1,0),
        ("session","Listening Session · Papersound","Papersound","guests",
         json.dumps(["20:00","21:30"]), json.dumps([]), json.dumps(None),1,1),
        ("class","Class · Oath Studio","Oath Studio","class",
         json.dumps(None), json.dumps([]), json.dumps([
            {"name":"Sunrise Breathwork","slots":["07:30"]},
            {"name":"Slow Flow Yoga","slots":["09:00"]},
            {"name":"Movement & Mobility","slots":["18:00"]},
            {"name":"Sound Bath & Stillness","slots":["19:30"]},
            {"name":"Restorative & Recovery","slots":["17:00"]},
         ]),1,2),
    ]
    c.executemany("INSERT INTO experiences (key,label,where_txt,party_type,slots,full,classes,published,sort) VALUES (?,?,?,?,?,?,?,?,?)", experiences)
    stories = [
        (1,"Culture","June 2026","The slow return — why we built a House of Rituals",
         "In a city that never stops, we made a place that does. A note on gathering, sound and stillness — and the year that brought Oath House to the heart of Vientiane.",
         "Vientiane is changing quickly. New towers, new traffic, new speed. Somewhere in that rush we felt a quieter need — for a place that remembers how to slow down, how to gather, how to listen.\n\n"
         "Oath House began as a habit long before it became a building. A long table on trestles. A borrowed turntable. A morning of breath on a bare floor. For nine years it had no address — it lived in courtyards and borrowed kitchens, on cassette reels and in a thousand sketches.\n\n"
         "What we built is not a restaurant, or a bar, or a studio, though it is all of those things. It is a house of rituals: food shared slowly, sound that asks to be heard, movement that returns the body to itself. Three rooms under one roof, each a different way of arriving.\n\n"
         "We named it Oath because that is what it is — a promise to keep things real. The grain of the wood. The weight of a cup. The conversation between strangers who leave as friends. Come empty. Stay late. Let the room hold you.",
         "photos/garden/garden-light.webp","#",1,0),
        (0,"Sound","May 2026","Notes from the listening room — Japanese jazz, 1978–1985",
         "Some records ask to be played loud. These ask to be played close.",
         "There is a particular warmth to Japanese jazz of the late seventies and early eighties — a softness in the recording, a patience in the playing, that suits a dim room and a single turntable.\n\n"
         "At Papersound we play it on Side A nights, two sets, one needle. No skipping, no shuffling. The record decides the pace, and so do you.\n\n"
         "Sit close. The room is built for it.",
         "textures/earth-red.jpg","#",1,1),
        (0,"Food","April 2026","On natural wine & the ritual of the long table",
         "A shared harvest, low-intervention wine, and bread torn by hand.",
         "The long table is the oldest ritual we have. Strangers seated shoulder to shoulder, plates passed, glasses filled by whoever sits nearest the bottle.\n\n"
         "We pour natural wine — low-intervention, alive, a little unpredictable — because it tastes like the place it came from. Fire-cooked vegetables, bread torn by hand, conversation that outlasts the meal.\n\n"
         "Come hungry. Leave as kin.",
         "photos/garden/garden-table.webp","#",1,2),
        (0,"Wellness","March 2026","Breath, concrete & light — a morning inside Oath Studio",
         "Concrete and linen, natural light moving slowly across a bare floor.",
         "The studio is where the house exhales. A bare floor, soft shadow, the smell of linen. A room built for the body to return to itself — through breath, through movement, through stillness.\n\n"
         "Mornings begin with guided breath as the first light crosses the floor. No mirrors, no rush. Just the slow work of arriving.\n\n"
         "Come empty. Leave grounded.",
         "photos/garden/garden-hands.webp","#",1,3),
    ]
    c.executemany("INSERT INTO stories (featured,category,date,title,excerpt,body,image,link,published,sort) VALUES (?,?,?,?,?,?,?,?,?,?)", stories)
    c.commit()

def row_to_obj(row):
    o = dict(row)
    for f in JSON_FIELDS:
        if f in o and o[f] is not None:
            try: o[f] = json.loads(o[f])
            except Exception: pass
    return o

# ── config / auth ────────────────────────────────────────────────────────────
def load_config():
    if not os.path.exists(CONFIG):
        salt = secrets.token_hex(16)
        cfg = {
            "salt": salt,
            "password_hash": hash_pw(DEFAULT_PASSWORD, salt),
            "secret": secrets.token_hex(32),
        }
        env_pw = os.environ.get("ADMIN_PASSWORD")
        if env_pw:
            cfg["pw_env_sig"] = cfg["password_hash"]   # remember which env value we applied
        save_config(cfg)
        print(f"  ↳ created {CONFIG}  (default admin password: {DEFAULT_PASSWORD})")
    with open(CONFIG) as f:
        cfg = json.load(f)
    # Let ADMIN_PASSWORD reset the admin password from Render's dashboard: when the
    # env value CHANGES, re-apply it. A password changed from the admin panel still
    # persists across deploys (the env value is unchanged, so we don't touch it).
    env_pw = os.environ.get("ADMIN_PASSWORD")
    if env_pw:
        sig = hash_pw(env_pw, cfg["salt"])
        if cfg.get("pw_env_sig") != sig:
            cfg["password_hash"] = sig
            cfg["pw_env_sig"] = sig
            save_config(cfg)
            print("  ↳ admin password reset from the ADMIN_PASSWORD environment variable")
    return cfg

def save_config(cfg):
    with open(CONFIG, "w") as f:
        json.dump(cfg, f, indent=2)

def hash_pw(password, salt):
    return hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 200000).hex()

def notify_reservation(d):
    """Email the house when a reservation arrives — only if SMTP is configured in
    config.json, e.g.  "smtp": {"host":"smtp.gmail.com","port":587,
    "user":"you@gmail.com","pass":"app-password","notify":"reservations@oathhouse.la"}.
    Without it, reservations are still saved and visible in the admin Bookings tab."""
    smtp = (CFG or {}).get("smtp")
    if not smtp or not smtp.get("host"):
        return
    import smtplib
    from email.message import EmailMessage
    body = (f"New reservation request\n\n"
            f"Name:    {d.get('name','')}\n"
            f"Experience: {d.get('exp_label','')}\n"
            f"Date:    {d.get('date','')}   Time: {d.get('time','')}\n"
            f"Party:   {d.get('party','')}\n"
            f"Email:   {d.get('email','')}\n"
            f"Phone:   {d.get('phone','')}\n"
            f"Note:    {d.get('notes','')}\n")
    msg = EmailMessage()
    msg["Subject"] = f"New reservation — {d.get('name','')}"
    msg["From"] = smtp.get("user")
    msg["To"] = smtp.get("notify") or smtp.get("user")
    msg.set_content(body)
    with smtplib.SMTP(smtp["host"], int(smtp.get("port", 587)), timeout=10) as s:
        s.starttls()
        if smtp.get("user"): s.login(smtp["user"], smtp.get("pass", ""))
        s.send_message(msg)

def make_token(secret):
    exp = int(time.time()) + SESSION_HOURS*3600
    payload = base64.urlsafe_b64encode(json.dumps({"exp": exp}).encode()).decode()
    sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{sig}"

def verify_token(token, secret):
    try:
        payload, sig = token.split(".")
        good = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, good): return False
        data = json.loads(base64.urlsafe_b64decode(payload.encode()))
        return data.get("exp", 0) > time.time()
    except Exception:
        return False

# ── HTTP handler ─────────────────────────────────────────────────────────────
class Handler(BaseHTTPRequestHandler):
    server_version = "OathHouse/1.0"

    def log_message(self, *a):  # quieter logs
        pass

    # -- helpers --
    def send_json(self, obj, status=200, set_cookie=None):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        if set_cookie:
            self.send_header("Set-Cookie", set_cookie)
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        n = int(self.headers.get("Content-Length") or 0)
        if not n: return {}
        try: return json.loads(self.rfile.read(n) or b"{}")
        except Exception: return {}

    def authed(self):
        cookie = SimpleCookie(self.headers.get("Cookie", ""))
        tok = cookie["oath_session"].value if "oath_session" in cookie else ""
        return bool(tok) and verify_token(tok, CFG["secret"])

    # -- routing --
    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/content":      return self.api_content()
        if path == "/api/instructors":  return self.api_instructors()
        if path.startswith("/api/story/"): return self.api_story(path)
        if path == "/api/session":      return self.send_json({"authed": self.authed()})
        if path.startswith("/api/admin/"): return self.api_admin("GET", path)
        return self.serve_static(path)

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/api/login":  return self.api_login()
        if path == "/api/logout": return self.api_logout()
        if path == "/api/reserve": return self.api_reserve()
        if path == "/api/subscribe": return self.api_subscribe()
        if path == "/api/admin/password": return self.api_password()
        if path == "/api/admin/upload": return self.api_upload()
        if path.startswith("/api/admin/"): return self.api_admin("POST", path)
        self.send_json({"error":"not found"}, 404)

    def do_PUT(self):
        path = urlparse(self.path).path
        if path.startswith("/api/admin/"): return self.api_admin("PUT", path)
        self.send_json({"error":"not found"}, 404)

    def do_DELETE(self):
        path = urlparse(self.path).path
        if path.startswith("/api/admin/"): return self.api_admin("DELETE", path)
        self.send_json({"error":"not found"}, 404)

    # -- auth endpoints --
    def api_login(self):
        data = self.read_json()
        if hash_pw(data.get("password",""), CFG["salt"]) == CFG["password_hash"]:
            tok = make_token(CFG["secret"])
            ck = f"oath_session={tok}; HttpOnly; Path=/; Max-Age={SESSION_HOURS*3600}; SameSite=Lax"
            return self.send_json({"ok": True}, set_cookie=ck)
        return self.send_json({"ok": False, "error":"Wrong password"}, 401)

    def api_logout(self):
        ck = "oath_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax"
        return self.send_json({"ok": True}, set_cookie=ck)

    def api_password(self):
        if not self.authed(): return self.send_json({"error":"unauthorised"}, 401)
        data = self.read_json()
        if hash_pw(data.get("current",""), CFG["salt"]) != CFG["password_hash"]:
            return self.send_json({"ok": False, "error":"Current password is wrong"}, 400)
        newpw = data.get("new","")
        if len(newpw) < 6:
            return self.send_json({"ok": False, "error":"New password must be at least 6 characters"}, 400)
        CFG["password_hash"] = hash_pw(newpw, CFG["salt"])
        save_config(CFG)
        return self.send_json({"ok": True})

    # -- public reservation request --
    def api_reserve(self):
        d = self.read_json()
        name = (d.get("name") or "").strip()
        email = (d.get("email") or "").strip()
        if len(name) < 2 or "@" not in email:
            return self.send_json({"ok": False, "error": "Name and a valid email are required"}, 400)
        c = db()
        cur = c.execute(
            "INSERT INTO reservations (exp,exp_label,date,time,party,name,email,phone,notes,status,created) "
            "VALUES (?,?,?,?,?,?,?,?,?,'new',?)",
            (d.get("exp"), d.get("exp_label"), d.get("date"), d.get("time"), d.get("party"),
             name, email, (d.get("phone") or "").strip(), (d.get("notes") or "").strip(),
             time.strftime("%Y-%m-%d %H:%M")))
        c.commit(); rid = cur.lastrowid; c.close()
        try: notify_reservation(d)
        except Exception as e: print("  (reservation email skipped:", e, ")")
        return self.send_json({"ok": True, "ref": rid})

    # -- newsletter signup (public) --
    def api_subscribe(self):
        email = (self.read_json().get("email") or "").strip().lower()
        if "@" not in email or "." not in email.split("@")[-1]:
            return self.send_json({"ok": False, "error": "Enter a valid email"}, 400)
        c = db()
        try:
            c.execute("INSERT OR IGNORE INTO subscribers (email, created) VALUES (?, ?)",
                      (email, time.strftime("%Y-%m-%d %H:%M")))
            c.commit()
        finally:
            c.close()
        return self.send_json({"ok": True})

    # -- image upload (base64 from the admin) --
    def api_upload(self):
        if not self.authed():
            return self.send_json({"error":"unauthorised"}, 401)
        data = self.read_json()
        name = data.get("name", "image")
        raw = data.get("data", "")
        if "," in raw and raw.strip().startswith("data:"):
            raw = raw.split(",", 1)[1]               # strip data:…;base64, prefix
        ext = os.path.splitext(name)[1].lower()
        if ext not in ALLOWED_UPLOAD:
            return self.send_json({"error": f"Unsupported file type ({ext or 'unknown'})"}, 400)
        try:
            blob = base64.b64decode(raw)
        except Exception:
            return self.send_json({"error":"Could not read the file"}, 400)
        limit = 30 if ext in ALLOWED_AUDIO else 12
        if len(blob) > limit * 1024 * 1024:
            return self.send_json({"error": f"File is larger than {limit} MB"}, 400)
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        fname = f"{secrets.token_hex(8)}{ext}"
        with open(os.path.join(UPLOAD_DIR, fname), "wb") as f:
            f.write(blob)
        return self.send_json({"url": f"uploads/{fname}"})

    # -- public content --
    def api_content(self):
        c = db()
        ev = [row_to_obj(r) for r in c.execute("SELECT * FROM events WHERE published=1 ORDER BY sort, id")]
        ex = [row_to_obj(r) for r in c.execute("SELECT * FROM experiences WHERE published=1 ORDER BY sort, id")]
        st = [row_to_obj(r) for r in c.execute("SELECT * FROM stories WHERE published=1 ORDER BY sort, id")]
        for s in st: s.pop("body", None)        # keep the homepage payload lean
        md = {r["key"]: r["image"] for r in c.execute("SELECT key, image FROM media")}
        song = c.execute("SELECT title, artist, src FROM music WHERE active=1 AND src!='' ORDER BY sort, id LIMIT 1").fetchone()
        c.close()
        self.send_json({"events": ev, "experiences": ex, "stories": st, "media": md,
                        "music": (row_to_obj(song) if song else None)})

    # -- instructors (for the Our Instructors page) --
    def api_instructors(self):
        c = db()
        rows = [row_to_obj(r) for r in c.execute("SELECT * FROM instructors WHERE published=1 ORDER BY sort, id")]
        c.close()
        self.send_json({"instructors": rows})

    # -- single article (full body) --
    def api_story(self, path):
        sid = path.rsplit("/", 1)[-1]
        if not sid.isdigit():
            return self.send_json({"error": "not found"}, 404)
        c = db()
        row = c.execute("SELECT * FROM stories WHERE id=? AND published=1", (sid,)).fetchone()
        c.close()
        if not row:
            return self.send_json({"error": "not found"}, 404)
        self.send_json({"story": row_to_obj(row)})

    # -- admin CRUD --
    def api_admin(self, method, path):
        if not self.authed():
            return self.send_json({"error":"unauthorised"}, 401)
        parts = path.strip("/").split("/")     # api admin <collection> [id]
        collection = parts[2] if len(parts) > 2 else ""
        if collection not in COLLECTIONS:
            return self.send_json({"error":"unknown collection"}, 404)
        cols = COLLECTIONS[collection]
        rid = parts[3] if len(parts) > 3 else None
        c = db()
        try:
            if method == "GET":
                rows = [row_to_obj(r) for r in c.execute(f"SELECT * FROM {collection} ORDER BY sort, id")]
                return self.send_json({"items": rows})
            if method == "POST":
                data = self.clean(self.read_json(), cols)
                fields = list(data.keys())
                ph = ",".join("?" for _ in fields)
                cur = c.execute(f"INSERT INTO {collection} ({','.join(fields)}) VALUES ({ph})", [data[f] for f in fields])
                if collection == "music" and data.get("active"): self.solo_active(c, cur.lastrowid)
                c.commit()
                row = c.execute(f"SELECT * FROM {collection} WHERE id=?", (cur.lastrowid,)).fetchone()
                return self.send_json({"item": row_to_obj(row)}, 201)
            if method == "PUT":
                if not rid: return self.send_json({"error":"id required"}, 400)
                data = self.clean(self.read_json(), cols)
                if data:
                    sets = ",".join(f"{f}=?" for f in data)
                    c.execute(f"UPDATE {collection} SET {sets} WHERE id=?", [*data.values(), rid])
                    if collection == "music" and data.get("active"): self.solo_active(c, rid)
                    c.commit()
                row = c.execute(f"SELECT * FROM {collection} WHERE id=?", (rid,)).fetchone()
                return self.send_json({"item": row_to_obj(row) if row else None})
            if method == "DELETE":
                if not rid: return self.send_json({"error":"id required"}, 400)
                c.execute(f"DELETE FROM {collection} WHERE id=?", (rid,))
                c.commit()
                return self.send_json({"ok": True})
        finally:
            c.close()

    def solo_active(self, c, keep_id):
        """Only one song can be the active 'now playing' track at a time."""
        c.execute("UPDATE music SET active=0 WHERE id!=?", (keep_id,))

    def clean(self, data, cols):
        """Keep only allowed columns; coerce booleans + JSON fields for storage."""
        out = {}
        for k in cols:
            if k not in data: continue
            v = data[k]
            if k in BOOL_FIELDS: v = 1 if v in (1, True, "1", "true", "on") else 0
            elif k == "sort": v = int(v or 0)
            elif k in JSON_FIELDS: v = json.dumps(v)
            out[k] = v
        return out

    # -- static files --
    def serve_static(self, path):
        if path == "/" or path == "":
            path = "/index.html"
        if path.rstrip("/") == "/admin":
            return self.send_file(os.path.join(ROOT, "admin", "index.html"))
        if path.startswith("/admin/"):
            target = safe_join(os.path.join(ROOT, "admin"), path[len("/admin/"):])
        elif path.startswith("/uploads/"):
            target = safe_join(UPLOAD_DIR, path[len("/uploads/"):])   # may live on a mounted disk
        else:
            target = safe_join(ROOT, path.lstrip("/"))
        if target and os.path.isdir(target):
            target = os.path.join(target, "index.html")
        if not target or not os.path.isfile(target):
            return self.send_json({"error":"not found"}, 404)
        self.send_file(target)

    def send_file(self, target):
        ctype = mimetypes.guess_type(target)[0] or "application/octet-stream"
        with open(target, "rb") as f:
            body = f.read()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        # no-cache for the documents we actively edit; long cache is fine for media but
        # keep it simple + always fresh for local previewing
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


def safe_join(base, rel):
    target = os.path.normpath(os.path.join(base, rel))
    if target == base or target.startswith(base + os.sep):
        return target
    return None


class Server(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True


CFG = None
def main():
    global CFG
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    init_db()
    CFG = load_config()
    print(f"Oath House backend → http://{HOST}:{PORT}")
    print(f"  • site   http://{HOST}:{PORT}/")
    print(f"  • admin  http://{HOST}:{PORT}/admin")
    Server((HOST, PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
