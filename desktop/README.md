# S POS — Windows Desktop App (`desktop/`)

The shop-in-a-box: one `SPOS.exe` that is **server + till + back-office** for a whole
store. SQLite inside, nothing to install, and every tablet/phone/extra register on the
shop Wi-Fi connects to it. Install steps live in [`INSTALL.md`](INSTALL.md) — this
README explains how it works.

Developed by **Sridhar Mahalingam**.

![Point of Sale](../docs/screenshots/desktop/03-point-of-sale.png)

---

## 1. What one exe gives the shop

```mermaid
flowchart TB
    EXE["SPOS.exe"] --> WIN["🖥️ Native app window\n(pywebview / WebView2)\nfor the owner's PC"]
    EXE --> SRV["waitress web server\n0.0.0.0:8971 · 8 threads"]
    SRV --> T1["📲 Tablet register\n(browser or mobile app)"]
    SRV --> T2["📱 Cashier's phone\n(S POS mobile app)"]
    SRV --> T3["🖥️ Second till PC\n(browser)"]
    EXE --> DATA[("%LOCALAPPDATA%\\SPOS\nSQLite DB · uploads ·\nsecret key · spos.log")]
```

- **Full functionality** — the bundled web UI is the complete "Aurora" back-office +
  POS ([`frontend/README.md`](../frontend/README.md) tours every page); the API inside
  is the complete Django backend ([`backend/README.md`](../backend/README.md)).
- **Offline by design** — no internet needed, ever. The Wi-Fi router is enough.
- **Multi-register** — other devices open `http://<PC-IP>:8971/` or point the
  **S POS mobile app** at that address.

## 2. Boot sequence (what `run_spos.py` does)

```mermaid
sequenceDiagram
    participant U as User double-clicks SPOS.exe
    participant L as Launcher
    participant D as Django (in-process)
    U->>L: start
    L->>L: locate bundled backend + webapp<br/>(PyInstaller _MEIPASS or source tree)
    L->>L: ensure %LOCALAPPDATA%\SPOS exists,<br/>route all logs to spos.log
    L->>D: migrate --noinput (create/upgrade DB)<br/>collectstatic
    L->>L: pick a free port: 8971 → 8972 → 8080 → 8000
    L->>D: serve via waitress on 0.0.0.0:port (thread)
    L->>L: wait until the port answers
    L->>U: print addresses (this computer / other devices)
    L->>U: open native WebView2 window<br/>(fallback: Edge/Chrome app-mode → default browser)
    Note over L: closing the window stops the server<br/>for every connected device
```

Other behaviours:
- **First run** → the web UI shows the **setup wizard** (store, currency, owner login).
  No default account is shipped.
- **Update check** — if `SPOS_UPDATE_URL` is set, a JSON manifest is polled and a
  newer version is announced at startup (current `APP_VERSION = 1.0.0`).
- **Custom data folder** — set `SPOS_DATA` to move the database elsewhere (e.g. a
  synced folder).

## 3. Build pipeline

```mermaid
flowchart LR
    FE["frontend/\nVITE_API_URL=/api/v1\nnpm run build"] -->|"copy dist →"| WEBAPP["desktop/webapp/"]
    BE["backend/v17src\n(Django source)"] --> SPEC
    WEBAPP --> SPEC["spos.spec\n(PyInstaller recipe)"]
    RUN["run_spos.py"] --> SPEC
    SPEC -->|"build-exe.bat"| DIST["dist/SPOS/SPOS.exe\n(zip & distribute)"]
    DIST -->|"optional: installer.iss\n(Inno Setup)"| SETUP["S-POS-Setup.exe"]
```

## 4. Files in this folder

| File | Purpose |
|---|---|
| `run_spos.py` | Launcher — boots the backend, serves the LAN, opens the window |
| `Start-S-POS.bat` | Run from source (needs Python 3.11+) |
| `build-exe.bat` | Build the standalone `SPOS.exe` |
| `spos.spec` | PyInstaller build recipe |
| `installer.iss` | Inno Setup script for a one-file installer |
| `requirements-desktop.txt` | Extra packages (waitress, pywebview, pyinstaller, whitenoise) |
| `webapp/` | Pre-built web UI served by the app |

## 5. The screens it serves

All captured in the full tour — [`docs/SCREENSHOTS.md`](../docs/SCREENSHOTS.md):
Overview dashboard, Point of Sale (split tender, park/hold, register sessions),
Sales, Customers, Gift Cards, Loyalty, Time Clock, Products, Categories, Variants,
Promotions, Price Lists, Stock, Stock Counts, Transfers, Suppliers, Purchasing,
Reports (X/Z), Refunds, Expenses, Approvals, Reconciliation, Registers, Sessions,
Cash Movements, Stores, Companies, Users, Tax Rates, Settings.

| Overview | Reports |
|---|---|
| ![Overview](../docs/screenshots/desktop/02-dashboard.png) | ![Reports](../docs/screenshots/desktop/10-reports.png) |

## 6. Troubleshooting

- **Other devices can't connect** → allow `SPOS.exe` through Windows Firewall
  (Private networks); same Wi-Fi required.
- **Window doesn't open** → the server still runs; open `http://127.0.0.1:8971/` manually.
- **Reset everything** → delete `%LOCALAPPDATA%\SPOS` (recreated on next launch).
- **Logs** → `%LOCALAPPDATA%\SPOS\spos.log` captures all output of the windowed exe.

© S POS · Developed by **Sridhar Mahalingam**.
