# S POS — Desktop App (Windows)

**Developed by Sridhar Mahalingam.**

A self-contained point-of-sale app for a shop. It runs on **one Windows computer**
(no separate database or internet required) and other devices — tablets, phones,
extra registers — connect to it over the **same Wi‑Fi**.

- Database: **SQLite** (a single file, created automatically)
- No PostgreSQL, no Redis, no Node — nothing else to install
- Data is stored in `%LOCALAPPDATA%\SPOS` (safe across app updates)
- **First run shows a setup wizard** — you create your own shop, currency and owner account (no default password)

> This folder is the Windows app. The **website version stays separate** in
> `../frontend` + `../backend` and is unaffected.

---

## For a shop owner — using the finished app

1. Get the `SPOS` folder (built with `build-exe.bat`, see below) and copy it anywhere.
2. Double‑click **`SPOS.exe`** (or install with `S-POS-Setup.exe`).
3. The app window opens. On first run, complete the **setup wizard** (store name, currency, owner login).
4. A small black window shows two addresses, e.g.:
   ```
   This computer : http://127.0.0.1:8971/
   Other devices : http://192.168.1.20:8971/   (same Wi-Fi)
   ```
   On a tablet/phone/second register on the same Wi‑Fi, open that **Other devices**
   address in a browser to use S POS there too.
5. To stop, close the window.

> First launch creates the database and demo products. After that it starts instantly.
> **Change the admin password** (Users page) before real use, and add your own
> company name/currency under Settings ▸ Companies.

---

## Run it now without building (needs Python)

If you just want to run it on a dev machine:

1. Install **Python 3.11+** from <https://python.org> (tick *Add python.exe to PATH*).
2. Double‑click **`Start-S-POS.bat`**. First run installs packages, then it launches.

---

## Build the standalone `SPOS.exe` (for distribution)

On a build machine with **Python 3.11+**:

1. Make sure the web UI is built into `desktop\webapp\` (already included here; to
   rebuild it: `cd ..\frontend` → `set VITE_API_URL=/api/v1` → `npm install && npm run build`,
   then copy `frontend\dist` to `desktop\webapp`).
2. Double‑click **`build-exe.bat`** (or run `pyinstaller --noconfirm spos.spec`).
3. The finished app appears in **`dist\SPOS\`**. Zip that folder to distribute; the
   shop owner just unzips and runs `SPOS.exe`.

### Optional: one‑file installer
Wrap `dist\SPOS` with **Inno Setup** (free) to produce a single `S-POS-Setup.exe`
that installs to Program Files and adds a Start‑menu shortcut.

---

## Files in this folder
| File | Purpose |
|---|---|
| `run_spos.py` | Launcher — boots the backend and opens the app window |
| `Start-S-POS.bat` | Run from source (needs Python) |
| `build-exe.bat` | Build the standalone `SPOS.exe` |
| `spos.spec` | PyInstaller build recipe |
| `requirements-desktop.txt` | Extra packages (waitress, pywebview, pyinstaller) |
| `webapp/` | Pre-built web UI served by the app |

---

## Troubleshooting
- **"Python is required"** → install Python 3.11+ and re-run.
- **Other devices can't connect** → allow `SPOS.exe`/Python through Windows Firewall
  (Private networks), and confirm all devices are on the same Wi‑Fi.
- **Reset everything** → delete the `%LOCALAPPDATA%\SPOS` folder; it re-creates on next launch.
