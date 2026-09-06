from django.db import models
from stores.models import Company
class CompanySetting(models.Model):
    company=models.OneToOneField(Company,on_delete=models.CASCADE,related_name="settings")
    default_currency=models.CharField(max_length=10,default="QAR")
    timezone=models.CharField(max_length=64,default="Asia/Qatar")
    tax_enabled=models.BooleanField(default=True)
    offline_enabled=models.BooleanField(default=True)
class CompanySequence(models.Model):
    company=models.ForeignKey(Company,on_delete=models.CASCADE,related_name="sequences")
    name=models.CharField(max_length=50)
    next_value=models.BigIntegerField(default=1)
    class Meta:
        constraints=[models.UniqueConstraint(fields=["company","name"],name="uniq_company_sequence")]
