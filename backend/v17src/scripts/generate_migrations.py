"""Generate all initial migrations once dependencies are installed.
This script intentionally runs outside Django startup so AppRegistry is ready.
"""
import os,sys
os.environ.setdefault("DJANGO_SETTINGS_MODULE","config.settings")
import django
django.setup()
from django.core.management import call_command
call_command("makemigrations")
call_command("migrate")
