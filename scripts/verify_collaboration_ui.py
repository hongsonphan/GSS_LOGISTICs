import os
import sys
sys.path.insert(0, '/app')
sys.path.insert(0, 'e:/Bim_Logistics')
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model

User = get_user_model()
u = User.objects.filter(is_superuser=True).first()
client = Client()
if u:
    client.force_login(u)

res = client.get('/')
html = res.content.decode('utf-8')

print("VIEW_BAN_TIN_EXISTS:", "view-ban-tin" in html)
print("VIEW_GIAO_VIEC_EXISTS:", "view-giao-viec" in html)
print("CHAT_BUBBLE_EXISTS:", "chat-bubble-container" in html)
print("SIDEBAR_NEWS_EXISTS:", 'data-target="ban-tin"' in html)
print("SIDEBAR_TASKS_EXISTS:", 'data-target="giao-viec"' in html)
print("COLLABORATION_JS_EXISTS:", "collaboration.js" in html)

res_news = client.get('/api/collaboration/news/posts/')
print("API_NEWS_STATUS:", res_news.status_code, "COUNT:", len(res_news.json().get('data', [])))

res_tasks = client.get('/api/collaboration/tasks/?view=kanban')
print("API_TASKS_STATUS:", res_tasks.status_code, "COUNTS:", res_tasks.json().get('counts'))
