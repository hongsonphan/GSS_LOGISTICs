import os
import sys
import json
import datetime
sys.stdout.reconfigure(encoding='utf-8')
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()
admin_user = User.objects.filter(is_superuser=True).first()

client = Client()
client.force_login(admin_user)

today = timezone.now().date()
from_10d = (today - datetime.timedelta(days=9)).strftime('%Y-%m-%d')
to_today = today.strftime('%Y-%m-%d')
from_year = f"{today.year}-01-01"
to_year = f"{today.year}-12-31"

endpoints = [
    ('Sales API (10 days)', f'/api/sales/?from_date={from_10d}&to_date={to_today}'),
    ('Sales API (Year)', f'/api/sales/?from_date={from_year}&to_date={to_year}'),
    ('Trips API (10 days)', f'/api/trips/?from_date={from_10d}&to_date={to_today}'),
    ('Accounting Overview (10 days)', f'/api/accounting/?from_date={from_10d}&to_date={to_today}'),
    ('Reimbursables API (10 days)', f'/api/accounting/reimbursables/?from_date={from_10d}&to_date={to_today}'),
    ('Cashbook API (10 days)', f'/api/accounting/cashbook/?from_date={from_10d}&to_date={to_today}'),
    ('Subcontractor API (10 days)', f'/api/accounting/subcontractor-settlements/?from_date={from_10d}&to_date={to_today}'),
    ('BOT Audit API (10 days)', f'/api/accounting/bot-audit/?from_date={from_10d}&to_date={to_today}'),
    ('Customs API (10 days)', f'/api/customs/declarations/?from_date={from_10d}&to_date={to_today}'),
    ('Vehicles / Fleet API', '/api/fleet/'),
    ('Employees API', '/api/personnel/employees/'),
    ('Master Data Locations', '/api/master-data/locations/'),
]

print('=== KIEM TRA TAT CA CAC ENDPOINT API DU LIEU BANG ===')
for name, url in endpoints:
    res = client.get(url)
    if res.status_code == 200:
        data = res.json()
        if isinstance(data, list):
            count = len(data)
            print(f"✅ {name}: 200 OK | Count: {count}")
        elif isinstance(data, dict):
            # check key counts
            keys_info = []
            for k, v in data.items():
                if isinstance(v, list):
                    keys_info.append(f"{k}: {len(v)}")
            print(f"✅ {name}: 200 OK | {', '.join(keys_info) if keys_info else 'Dict response'}")
    else:
        print(f"❌ {name}: Status {res.status_code} | {res.content[:200]}")
