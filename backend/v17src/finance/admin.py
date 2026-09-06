from django.contrib import admin
from .models import Account,JournalEntry,JournalLine,PaymentReconciliation
admin.site.register(Account)
admin.site.register(JournalEntry)
admin.site.register(JournalLine)
admin.site.register(PaymentReconciliation)
