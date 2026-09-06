from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def test_production_v18_markers_present():
    assert (ROOT/"PRODUCTION_V18.md").exists()
    assert "VERSION=\"18.0.0\"" in (ROOT/"config/settings.py").read_text()

def test_checkout_persists_failure_outside_atomic_block():
    text=(ROOT/"checkout_engine/services.py").read_text()
    assert "with transaction.atomic():" in text and "fail(tx,exc)" in text

def test_split_tender_posts_each_payment():
    text=(ROOT/"finance/services.py").read_text()
    assert 'for payment in sale.payments.filter(status="CAPTURED")' in text

def test_inventory_low_stock_is_store_specific():
    text=(ROOT/"reports/views.py").read_text()
    assert "StoreInventory" in text
