import requests

PAYSTACK_BASE = "https://api.paystack.co"

def initialize_transaction(secret_key: str, email: str, amount_kobo: int, reference: str, callback_url: str):
    headers = {"Authorization": f"Bearer {secret_key}", "Content-Type": "application/json"}
    payload = {
        "email": email,
        "amount": amount_kobo,
        "reference": reference,
        "callback_url": callback_url,
    }
    resp = requests.post(f"{PAYSTACK_BASE}/transaction/initialize", json=payload, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.json()

def verify_transaction(secret_key: str, reference: str):
    headers = {"Authorization": f"Bearer {secret_key}"}
    resp = requests.get(f"{PAYSTACK_BASE}/transaction/verify/{reference}", headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.json()