from django.db import models

class Company(models.Model):
    name=models.CharField(max_length=200)
    legal_name=models.CharField(max_length=250,blank=True)
    tax_number=models.CharField(max_length=100,blank=True)
    currency=models.CharField(max_length=10,default="QAR")
    active=models.BooleanField(default=True)
    def __str__(self): return self.name

class Store(models.Model):
    company=models.ForeignKey(Company,on_delete=models.CASCADE,related_name="stores")
    name=models.CharField(max_length=150)
    code=models.CharField(max_length=50)
    address=models.TextField(blank=True)
    phone=models.CharField(max_length=40,blank=True)
    active=models.BooleanField(default=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=["company","code"],name="uniq_store_code_per_company")]
    def __str__(self): return f"{self.company.name} - {self.name}"

class Register(models.Model):
    store=models.ForeignKey(Store,on_delete=models.CASCADE,related_name="registers")
    name=models.CharField(max_length=100)
    code=models.CharField(max_length=50)
    active=models.BooleanField(default=True)
    class Meta:
        constraints=[models.UniqueConstraint(fields=["store","code"],name="uniq_register_code_per_store")]
    def __str__(self): return f"{self.store.name} - {self.name}"
