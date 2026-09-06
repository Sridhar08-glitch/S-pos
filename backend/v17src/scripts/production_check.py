import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE","config.settings")
import django
django.setup()
from django.core.management import call_command
call_command("check", "--deploy")
