from django.db import models
class TaxRate(models.Model):
    name=models.CharField(max_length=100)
    code=models.CharField(max_length=30,unique=True)
    rate=models.DecimalField(max_digits=7,decimal_places=4)
    inclusive=models.BooleanField(default=False)
    active=models.BooleanField(default=True)
    def __str__(self): return f"{self.code} {self.rate}%"
