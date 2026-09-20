"""
執行方式: python manage.py shell < create_sample_data.py
建立測試用的範例資料
"""
import os, django, random
from datetime import date, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import Organization, User
from apps.cases.models import Case
from apps.services.models import ServiceItem, ServiceRecord
from apps.incidents.models import Incident

# 1. 建立機構
org, _ = Organization.objects.get_or_create(
    code='NTAH001',
    defaults={'name': '新東安居家服務', 'address': '台南市東區', 'phone': '06-2345678'}
)
print(f"✓ 機構: {org.name}")

# 2. 建立超管
admin_user, created = User.objects.get_or_create(
    username='admin',
    defaults={
        'chinese_name': '王督導', 'role': 'supervisor',
        'organization': org, 'employee_id': 'EMP001', 'is_staff': True, 'is_superuser': True
    }
)
if created:
    admin_user.set_password('admin1234')
    admin_user.save()
    print("✓ 超管帳號: admin / admin1234")

# 3. 建立居服員
caregivers = []
caregiver_names = ['陳小美', '黃雅婷', '林秀芬', '劉家宜', '吳佳玲']
for i, name in enumerate(caregiver_names):
    u, _ = User.objects.get_or_create(
        username=f'caregiver{i+1}',
        defaults={
            'chinese_name': name, 'role': 'caregiver',
            'organization': org, 'employee_id': f'EMP{i+10:03d}'
        }
    )
    if _:
        u.set_password('pass1234')
        u.save()
    caregivers.append(u)
print(f"✓ 居服員 {len(caregivers)} 位")

# 4. 建立服務項目
service_items_data = [
    ('BA01', '基本身體清潔', '身體照顧'),
    ('BA05', '基本日常照顧', '日常生活'),
    ('BA07', '協助沐浴', '身體照顧'),
    ('BA13', '協助餐食', '日常生活'),
    ('BA15-1', '陪同就醫', '就醫服務'),
    ('RA01', '日間照顧', '機構式服務'),
]
service_items = []
for code, name, cat in service_items_data:
    si, _ = ServiceItem.objects.get_or_create(code=code, defaults={'name': name, 'category': cat})
    service_items.append(si)
print(f"✓ 服務項目 {len(service_items)} 項")

# 5. 建立個案
case_data = [
    ('東區020', '111U14434', '王張月娥', 'F', '1935-03-15', '5', '台南市', '東區'),
    ('永康區018', '115U16015', '歐張春蘭', 'F', '1942-07-22', '4', '台南市', '永康區'),
    ('東區019', '115U15878', '黃淑美', 'F', '1948-11-08', '3', '台南市', '東區'),
    ('東區018', '115U14285', '吳文原', 'M', '1940-05-30', '5', '台南市', '東區'),
    ('永康區017', '115U13884', '張黔生', 'M', '1938-09-12', '6', '台南市', '永康區'),
    ('北區008', '115U14383', '陳振旺', 'M', '1945-01-25', '4', '台南市', '北區'),
    ('永康區014', '115U02399', '邱阿淑', 'F', '1952-06-18', '3', '台南市', '永康區'),
    ('永康區013', '115U12181', '談麗華', 'F', '1950-12-04', '4', '台南市', '永康區'),
    ('東區017', '115U10993', '許雪', 'F', '1943-08-16', '5', '台南市', '東區'),
    ('東區016', '114U18202', '鄭陳秀茹', 'F', '1946-03-07', '4', '台南市', '東區'),
]
cases = []
for i, (case_no, welfare_no, name, gender, bd, cms, city, district) in enumerate(case_data):
    c, _ = Case.objects.get_or_create(
        case_no=case_no,
        defaults={
            'welfare_no': welfare_no, 'name': name, 'gender': gender,
            'birth_date': date.fromisoformat(bd), 'cms_level': cms,
            'city': city, 'district': district,
            'status': 'active',
            'service_start_date': date.today() - timedelta(days=random.randint(30, 365)),
            'organization': org,
            'supervisor': admin_user,
            'primary_caregiver': caregivers[i % len(caregivers)],
            'created_by': admin_user,
        }
    )
    cases.append(c)
print(f"✓ 個案 {len(cases)} 筆")

# 6. 建立最近7天服務紀錄
today = date.today()
status_choices = ['completed', 'completed', 'completed', 'in_progress', 'pending']
record_count = 0
for days_ago in range(7):
    target_date = today - timedelta(days=days_ago)
    num_records = random.randint(8, 15)
    for _ in range(num_records):
        case = random.choice(cases)
        caregiver = random.choice(caregivers)
        service_item = random.choice(service_items)
        status = 'completed' if days_ago > 0 else random.choice(status_choices)
        ServiceRecord.objects.get_or_create(
            case=case, caregiver=caregiver, service_item=service_item,
            scheduled_date=target_date,
            defaults={
                'scheduled_start_time': f'{random.randint(8,16):02d}:00',
                'scheduled_end_time': f'{random.randint(9,17):02d}:30',
                'status': status,
            }
        )
        record_count += 1
print(f"✓ 服務紀錄 {record_count} 筆")

# 7. 建立異常事件
incident_types = ['fall', 'health', 'environment']
statuses = ['pending', 'processing', 'resolved', 'tracking']
for i in range(5):
    case = random.choice(cases)
    Incident.objects.get_or_create(
        case=case,
        occurred_at=f'{today - timedelta(days=i)} {random.randint(8,18):02d}:00:00',
        defaults={
            'incident_type': random.choice(incident_types),
            'severity': random.choice(['low', 'medium', 'high']),
            'status': random.choice(statuses),
            'description': '測試異常事件描述',
            'reported_by': admin_user,
        }
    )
print(f"✓ 異常事件建立完成")
print("\n🎉 範例資料建立完成！")
print("   管理員帳號: admin / admin1234")
print("   居服員帳號: caregiver1~5 / pass1234")
