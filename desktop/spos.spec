# -*- mode: python ; coding: utf-8 -*-
# PyInstaller build spec for the S POS desktop app.
# Developed by Sridhar Mahalingam.
import os
import sys
from pathlib import Path
from PyInstaller.utils.hooks import collect_submodules, collect_data_files, collect_all

HERE = Path(os.path.abspath(SPECPATH))
BACKEND = HERE.parent / "backend" / "v17src"
WEBAPP = HERE / "webapp"

# Configure Django during the build so dependency collection can import app modules
# (avoids "settings are not configured" while walking submodules).
sys.path.insert(0, str(BACKEND))
os.environ.setdefault("NOVAPOS_DESKTOP", "1")
os.environ.setdefault("DEBUG", "False")
os.environ.setdefault("SECRET_KEY", "build-only-key")
os.environ.setdefault("NOVAPOS_DATA", str(HERE / "_build_tmp"))
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings"
try:
    import django
    django.setup()
except Exception as _e:
    print("spec: django.setup skipped:", _e)

# Django discovers these by string (INSTALLED_APPS) + imports migrations dynamically,
# so we pull all their submodules in explicitly.
APPS = ["accounts", "stores", "catalog", "inventory", "customers", "sales", "registers",
        "audit", "reports", "purchasing", "promotions", "loyalty", "offline_sync",
        "finance", "expenses", "hardware", "pricing", "transaction_engine", "taxes",
        "health", "checkout_engine", "approvals", "tenancy", "production_core", "payments",
        "api_core", "config", "tests_support"]
THIRD = ["rest_framework", "rest_framework_simplejwt",
         "rest_framework_simplejwt.token_blacklist", "django_filters", "drf_spectacular",
         "corsheaders", "whitenoise", "waitress", "qrcode", "PIL", "dotenv"]

hiddenimports = ["seed_demo"]
binaries = []
extra_datas = []
# collect_all bundles submodules + data files + binaries for the framework packages.
for m in ["django"] + THIRD:
    try:
        d, b, h = collect_all(m)
        extra_datas += d; binaries += b; hiddenimports += h
    except Exception as _e:
        print("spec: collect_all skipped", m, _e)
# our own apps: pull every submodule (models, migrations, api modules imported by string)
for m in APPS:
    try:
        hiddenimports += collect_submodules(m)
    except Exception:
        pass

# Native app window (pywebview + pythonnet). Optional: the launcher falls back to
# Edge app-mode if these are missing, so a collection failure never breaks the build.
for m in ["webview", "pythonnet", "clr_loader"]:
    try:
        d, b, h = collect_all(m)
        extra_datas += d; binaries += b; hiddenimports += h
    except Exception as _e:
        print("spec: native-window dep skipped", m, _e)
hiddenimports += ["clr", "webview.platforms.edgechromium", "webview.platforms.winforms"]

# Bundle the backend source (so dynamic imports resolve) + the built web UI.
# Skip caches, the dev .env (never ship secrets), and any local database.
datas = [(str(WEBAPP), "webapp")]
SKIP_DIRS = {"__pycache__", "media", "staticfiles", ".pytest_cache"}
SKIP_FILES = {".env"}
for root, dirs, files in os.walk(BACKEND):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    for f in files:
        if f.endswith((".pyc", ".sqlite3", ".log")) or f in SKIP_FILES:
            continue
        full = Path(root) / f
        rel = full.relative_to(BACKEND)
        datas.append((str(full), str(Path("backend") / rel.parent)))

# CRITICAL: some third-party Django migrations read their own file from disk at import
# (e.g. simplejwt token_blacklist 0011). Ship those as real .py files, not archived.
try:
    datas += collect_data_files("rest_framework_simplejwt", include_py_files=True)
except Exception as _e:
    print("spec: simplejwt py-files skip:", _e)

datas += extra_datas

a = Analysis(
    ["run_spos.py"],
    pathex=[str(BACKEND)],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["tkinter","pytest","sentry_sdk","pandas","numpy","scipy","scipy.stats","torch","tensorflow",
              "tensorboard","keras","boto3","botocore","s3transfer","matplotlib","IPython","IPython.display",
              "notebook","jupyter","jupyter_client","ipykernel","sqlalchemy","pyarrow","numba","sklearn",
              "scikit_learn","cv2","PySide6","PySide2","PyQt5","PyQt6","wx","openpyxl",
              "fastapi","flask","grpc","altair","plotly","bokeh","dask","xarray","statsmodels"],
    noarchive=False,
)
pyz = PYZ(a.pure)
exe = EXE(
    pyz, a.scripts, [],
    exclude_binaries=True,
    name="SPOS",
    debug=False,
    strip=False,
    upx=False,
    console=False,         # clean native app: no CMD window (logs go to %LOCALAPPDATA%\SPOS\spos.log)
)
coll = COLLECT(exe, a.binaries, a.datas, strip=False, upx=False, name="SPOS")
