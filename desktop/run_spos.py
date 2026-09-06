"""
S POS — desktop launcher.
Runs the self-contained backend (SQLite, no external services) and opens the app
in a native window. Also serves on the local network so tablets/phones/other
registers can connect over the same Wi-Fi.

Developed by Sridhar Mahalingam.
"""
import os
import sys
import socket
import threading
import time
import webbrowser
from pathlib import Path

# ---- locate the backend + bundled web UI, whether running from source or frozen (.exe) ----
FROZEN = getattr(sys, "frozen", False)
if FROZEN:
    ROOT = Path(sys._MEIPASS)          # PyInstaller temp bundle
    BACKEND = ROOT / "backend"
    WEBAPP = ROOT / "webapp"
else:
    HERE = Path(__file__).resolve().parent
    BACKEND = HERE.parent / "backend" / "v17src"
    WEBAPP = HERE / "webapp"

# ---- per-machine data folder (database, uploads, secret key) ----
DATA = Path(os.getenv("SPOS_DATA") or (Path(os.getenv("LOCALAPPDATA", str(Path.home()))) / "SPOS"))
DATA.mkdir(parents=True, exist_ok=True)

# The windowed (no-console) build has no stdout/stderr. Route all output to a log file
# so prints and server logging never fail, and errors are still recorded for support.
try:
    _logf = open(DATA / "spos.log", "a", buffering=1, encoding="utf-8", errors="replace")
    sys.stdout = _logf
    sys.stderr = _logf
except Exception:
    pass

os.environ["NOVAPOS_DESKTOP"] = "1"
os.environ["DEBUG"] = "False"
os.environ["NOVAPOS_DATA"] = str(DATA)
os.environ["NOVAPOS_WEBAPP"] = str(WEBAPP)
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings"
sys.path.insert(0, str(BACKEND))

import django  # noqa: E402
django.setup()
from django.core.management import call_command  # noqa: E402


def initialize():
    """Create/upgrade the local database. No default account is created —
    the app shows a first-run setup wizard so the owner picks their own login."""
    call_command("migrate", "--noinput", verbosity=0)
    try:
        call_command("collectstatic", "--noinput", verbosity=0)
    except Exception:
        pass


def pick_port(preferred=8971):
    for p in (preferred, 8972, 8080, 8000, 0):
        s = socket.socket()
        try:
            s.bind(("0.0.0.0", p))
            port = s.getsockname()[1]
            s.close()
            return port
        except OSError:
            s.close()
            continue
    return preferred


def run_server(port):
    from waitress import serve
    from config.wsgi import application
    serve(application, host="0.0.0.0", port=port, threads=8)


def lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def _find_browser():
    """Locate Edge or Chrome to open a chromeless 'app' window."""
    import shutil
    candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    ]
    for name in ("msedge", "chrome"):
        p = shutil.which(name)
        if p:
            return p
    for p in candidates:
        if os.path.exists(p):
            return p
    return None


def open_app_window(url):
    """Open S POS. Returns True if it ran a blocking native window (app should exit
    when it returns), or False if it opened a detached window/browser (keep serving)."""
    # 1) TRUE native desktop window via pywebview (WebView2) - no browser chrome.
    try:
        import webview
        webview.create_window("S POS", url, width=1320, height=880, min_size=(980, 640))
        webview.start()
        return True
    except Exception as e:
        print("Native window unavailable, falling back:", e)
    # 2) Edge/Chrome in app-mode (a window, but a browser engine).
    import subprocess
    exe = _find_browser()
    if exe:
        try:
            subprocess.Popen([exe, f"--app={url}", "--window-size=1320,880",
                              f"--user-data-dir={DATA / 'window'}", "--no-first-run", "--no-default-browser-check"])
            return False
        except Exception:
            pass
    # 3) default browser.
    webbrowser.open(url)
    return False


APP_VERSION = "1.0.0"

def check_update():
    """Optional: if SPOS_UPDATE_URL is set, check a JSON manifest for a newer version."""
    url = os.getenv("SPOS_UPDATE_URL")
    if not url:
        return
    try:
        import json, urllib.request
        with urllib.request.urlopen(url, timeout=4) as r:
            data = json.loads(r.read().decode())
        latest = str(data.get("version", ""))
        if latest and latest != APP_VERSION:
            print(f"** Update available: {latest} (installed {APP_VERSION}). Get it at {data.get('url', '')} **")
    except Exception:
        pass

def main():
    print(f"S POS v{APP_VERSION} - starting up, please wait...")
    initialize()
    check_update()
    port = pick_port()
    threading.Thread(target=run_server, args=(port,), daemon=True).start()
    for _ in range(80):
        try:
            socket.create_connection(("127.0.0.1", port), 0.3).close()
            break
        except OSError:
            time.sleep(0.15)
    url = f"http://127.0.0.1:{port}/"
    print("\n" + "=" * 54)
    print("  S POS is running.")
    print(f"  This computer : {url}")
    print(f"  Other devices : http://{lan_ip()}:{port}/   (same Wi-Fi)")
    print("  Sign in       : admin / admin123")
    print("=" * 54 + "\n")
    blocked = open_app_window(url)
    if not blocked:
        print("S POS is open. Keep this window minimized while the shop is trading.")
        print("Closing this window stops S POS for all connected devices.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
