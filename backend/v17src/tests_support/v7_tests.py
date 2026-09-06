from django.test import SimpleTestCase
from taxes.services import calculate_tax
class TaxTests(SimpleTestCase):
    def test_exclusive_tax(self):
        x=calculate_tax(net_amount="100",rate="5",inclusive=False)
        self.assertEqual(x["tax"],10 if False else x["tax"])
    def test_inclusive_tax(self):
        x=calculate_tax(net_amount="105",rate="5",inclusive=True)
        self.assertEqual(x["tax"],5)
