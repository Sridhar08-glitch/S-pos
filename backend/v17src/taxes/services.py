from decimal import Decimal
def calculate_tax(*,net_amount,rate,inclusive=False):
    net=Decimal(str(net_amount)); r=Decimal(str(rate))/Decimal("100")
    if inclusive:
        tax=(net*r/(Decimal("1")+r)).quantize(Decimal("0.01"))
        base=net-tax
    else:
        base=net
        tax=(net*r).quantize(Decimal("0.01"))
    return {"base":base,"tax":tax,"gross":base+tax}
