# Oath House — Content Backend

A tiny, dependency-free backend (Python standard library only) that lets the
team manage what the website shows — calendar events, reservations and the
journal — from a password-protected admin dashboard. No build step, no npm,
no external services.

## Run it

```bash
cd ~/Documents/GitHub/oath
python3 server/app.py
```

Then open:

- **The website** → http://localhost:8080
- **The admin studio** → http://localhost:8080/admin

This one command serves the whole site *and* the API *and* the admin. You no
longer need a separate preview server.

## First time

- On first run it creates `server/oath.db` (the database, seeded with the
  content that's currently on the site) and `server/config.json` (holds the
  admin password — hashed — and a session secret).
- **Default admin password: `oathhouse`** — change it immediately from the
  admin dashboard → **Settings**.

## What the team can edit

| Section in admin | Controls on the site |
|---|---|
| **Bookings** | Reservation requests sent from the site — guest, experience, date/time, contact, notes. Mark each New / Confirmed / Cancelled. |
| **Calendar Events** | The featured event + the event list in the Calendar section |
| **Reservations** | The bookable experiences (names, time slots, sold-out slots, classes) |
| **Journal** | The featured story + the story cards (with image upload) |
| **Photos** | The main site photography — landing hero, the Garden rooms, the Studio. Upload a new image to swap any of them. |
| **Music** | Pick a song that plays on the site. Upload an audio file (or paste a direct audio URL) and mark it “Play on the site”. Only one plays at a time. |

Uploaded images and audio are saved to the `uploads/` folder and served from the site.

**About the music:** browsers don't allow sound to start on their own, so the
song begins the moment a visitor first interacts with the page (a click, scroll
or tap) — and the on-site **Sound** button turns it on/off. Use an actual audio
file (MP3/M4A/WAV) or a direct link to one; a Spotify/YouTube *page* link won't
play automatically.

Each item has a **Published** toggle (hide something without deleting it) and an
**Order** field (lower numbers show first). Events and stories have a
**Featured** toggle for the large card.

## Notes

- The public site reads `/api/content`. If the backend isn't running, the site
  still works — it falls back to the built-in content. So nothing breaks.
- The database is a single file (`server/oath.db`). Back it up by copying it.
- `oath.db` and `config.json` are git-ignored (they're per-machine data).

## Get emailed when a reservation comes in (optional)

Bookings always appear in the **Bookings** tab. To also get an email the moment
one arrives, add an `smtp` block to `server/config.json`:

```json
"smtp": {
  "host": "smtp.gmail.com", "port": 587,
  "user": "you@gmail.com", "pass": "your-app-password",
  "notify": "reservation@oathhouse.co"
}
```

(For Gmail use an [App Password](https://support.google.com/accounts/answer/185833),
not your normal password.) Without this block, nothing breaks — reservations are
just stored in the Bookings tab.

## Deploying to the internet (Render — recommended)

This site needs a host that runs Python (not plain static hosting), because of
the admin, bookings and live content. Render is the simplest. The repo already
includes a `render.yaml` blueprint that sets everything up.

### One time — put the code on GitHub
```bash
git add -A
git commit -m "Oath House site + content backend"
git push -u origin main
```

### Deploy on Render (~5 minutes)
1. Create an account at **render.com** and connect your GitHub.
2. **New +  →  Blueprint**, choose the `oath` repo. Render reads `render.yaml`.
3. It will create a **Web Service** with a **1 GB persistent disk** mounted at
   `/data` (this is where your database + uploaded photos/audio live, so they
   survive every restart and deploy).
4. When prompted, set the **ADMIN_PASSWORD** value to a strong password — this
   becomes your admin login on first boot.
5. Click **Apply**. First build takes a couple of minutes. You'll get a URL like
   `https://oath-house.onrender.com`.

### Point your domain (oathhouse.co)
1. In the Render service → **Settings → Custom Domains**, add `oathhouse.co`
   and `www.oathhouse.co`.
2. At your domain registrar, add the DNS records Render shows you (a CNAME / A
   record). HTTPS is issued automatically.

### After it's live
- Your site: `https://oathhouse.co` · admin: `https://oathhouse.co/admin`.
- Turn on reservation emails by adding the `smtp` block (above) — on Render put
  it in `config.json` on the disk, or ask me to switch it to environment vars.

### Notes
- **Plan:** the **Starter** plan ($7/mo) is required for the persistent disk. The
  free plan has no disk and sleeps, so your database would reset — don't use it
  for the live venue.
- **Backups:** your whole database is the single file `/data/oath.db`. Download
  it from the Render shell now and then to back up.
- **Railway / Fly.io / a VPS** also work — start command `python3 server/app.py`,
  give it a volume mounted at `/data`, and set `DATA_DIR=/data`.
