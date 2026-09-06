from django.core.management.base import BaseCommand
from catalog.models import Product
import qrcode

class Command(BaseCommand):
    help="Generate QR PNG files for products that have qr_code values."
    def handle(self,*args,**options):
        count=0
        for p in Product.objects.exclude(qr_code__isnull=True).exclude(qr_code=""):
            img=qrcode.make(p.qr_code)
            path=f"media/products/qr-{p.id}.png"
            import os
            os.makedirs(os.path.dirname(path),exist_ok=True)
            img.save(path); count+=1
        self.stdout.write(self.style.SUCCESS(f"Generated {count} QR images"))
