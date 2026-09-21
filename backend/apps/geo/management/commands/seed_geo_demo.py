"""為地理位置管理功能建立示範資料。

會依現在時間安排當日班表，讓四種狀態都真的出現在畫面上：
    綠  已完成（準時）
    黃  未完成（尚未逾時）
    紅  遲到（已逾時仍未打卡）
    紅/綠 遲到後補做完成

    python manage.py seed_geo_demo
    python manage.py seed_geo_demo --records 30
"""
import random
from datetime import datetime, time, timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import Organization, User
from apps.cases.models import Case
from apps.geo.models import CaregiverLocation
from apps.geo.address import classify
from apps.geo.services import local_datetime
from apps.services.models import ServiceItem, ServiceRecord

# 台南市區的示範門牌，讓定位服務有實際地址可查
DEMO_STREETS = [
    ('東區', '中華東路三段{}號'), ('東區', '林森路一段{}號'), ('東區', '崇學路{}號'),
    ('永康區', '中正南路{}號'), ('永康區', '中華路{}號'), ('永康區', '大灣路{}號'),
    ('北區', '公園路{}號'), ('北區', '和緯路二段{}號'),
    ('中西區', '民生路一段{}號'), ('安平區', '安平路{}號'),
]


class Command(BaseCommand):
    help = '建立地理位置管理的示範資料（當日班表、座標、居服員位置）'

    def add_arguments(self, parser):
        parser.add_argument('--records', type=int, default=23, help='當日班次數量，預設 23')

    def handle(self, *args, **options):
        random.seed(20260921)  # 固定種子，重跑結果一致
        total = options['records']
        today = timezone.localdate()
        now = timezone.localtime()
        grace = settings.SERVICE_LATE_GRACE_MINUTES

        org = Organization.objects.first()
        if not org:
            self.stderr.write(self.style.ERROR('找不到機構，請先執行 create_sample_data.py'))
            return

        cases = list(Case.objects.all())
        caregivers = list(User.objects.filter(role='caregiver').order_by('id'))
        items = list(ServiceItem.objects.all())
        if not (cases and caregivers and items):
            self.stderr.write(self.style.ERROR('缺少個案／居服員／服務項目，請先執行 create_sample_data.py'))
            return

        self._fill_addresses(cases, org)
        self._assign_supervisors(caregivers)
        self._geocode()

        cases = list(Case.objects.exclude(latitude__isnull=True))
        records = self._build_today_schedule(today, now, grace, cases, caregivers, items, total)
        self._place_caregivers(caregivers, records, now)

        self.stdout.write(self.style.SUCCESS(
            f'\n完成：當日班次 {len(records)} 筆、個案座標 {len(cases)} 筆、'
            f'居服員位置 {len(caregivers)} 筆'
        ))
        self.stdout.write('  地圖頁：登入後左側選單「地理位置管理」')
        self.stdout.write('  打卡頁：/checkin （用 caregiver1~5 / pass1234 登入）')

    # ── 1. 補地址 ────────────────────────────────────────────
    def _fill_addresses(self, cases, org):
        """補上完整門牌地址，並刻意保留兩筆不完整的，用來示範「未定位」狀態。

        會覆蓋任何不夠精確的地址（不只是空白的），這樣每次重跑都得到
        一致的示範狀態，而不是被上一輪殘留的半截地址影響。
        """
        filled = incomplete = 0
        for i, case in enumerate(cases):
            if classify(case.full_address).is_geocodable:
                continue
            district, pattern = DEMO_STREETS[i % len(DEMO_STREETS)]
            case.district = district
            case.city = '台南市'
            if i < 2:
                # 前兩筆刻意只到路段，示範地址不完整時的把關與畫面標示
                case.address = pattern.format('').replace('號', '').rstrip()
                incomplete += 1
            else:
                case.address = pattern.format(random.randint(1, 350))
                filled += 1
            case.save(update_fields=['city', 'district', 'address'])

        if not classify(org.address).is_geocodable:
            org.address = '台南市東區林森路一段149號'
            org.save(update_fields=['address'])

        self.stdout.write(
            f'✓ 個案地址：完整 {filled} 筆'
            + (f'、刻意留不完整 {incomplete} 筆（示範「未定位」）' if incomplete else '')
        )

    # ── 2. 指派居服員督導 ────────────────────────────────────
    def _assign_supervisors(self, caregivers):
        sups = list(User.objects.filter(role__in=['supervisor', 'org_admin', 'super_admin']))
        if not sups:
            return
        for i, cg in enumerate(caregivers):
            if cg.supervisor_id is None:
                cg.supervisor = sups[i % len(sups)]
                cg.save(update_fields=['supervisor'])
        self.stdout.write(f'✓ 指派居服員督導（{len(sups)} 位督導）')

    # ── 3. 定位 ──────────────────────────────────────────────
    def _geocode(self):
        from django.core.management import call_command
        # 用 --all 強制重算：補完門牌地址後，原本只依「台南市東區」這種
        # 行政區等級字串算出來的座標會讓同區個案全部疊在同一點，必須重跑。
        # 人工設定的座標由 geocode_cases 自己的保護機制擋住，不會被覆蓋。
        call_command('geocode_cases', all=True, verbosity=0)
        using_fallback = not (settings.TGOS_APP_ID and settings.TGOS_APP_KEY)
        note = '（TGOS 金鑰未設定，使用 fallback 假座標）' if using_fallback else '（TGOS 實際定位）'
        self.stdout.write(f'✓ 地址定位完成 {note}')

    # ── 4. 當日班表 ──────────────────────────────────────────
    def _build_today_schedule(self, today, now, grace, cases, caregivers, items, total):
        ServiceRecord.objects.filter(scheduled_date=today).delete()

        # 依現在時間切出「已過很久 / 剛過 / 未來」三段時間池（15 分鐘網格）
        def slots(from_hour):
            out = []
            for hour in range(from_hour, 22):
                for minute in (0, 15, 30, 45):
                    out.append(time(hour, minute))
            return out

        def split(grid):
            dp, rc, ft = [], [], []
            for t in grid:
                delta = (now - local_datetime(today, t)).total_seconds() / 60
                if delta > grace + 30:
                    dp.append(t)
                elif delta > -30:
                    rc.append(t)
                else:
                    ft.append(t)
            return dp, rc, ft

        deep_past, recent, future = split(slots(7))
        if len(deep_past) < 8:
            # 清晨執行時當日幾乎沒有過去時段，往 00:00 延伸讓四種狀態都能呈現
            deep_past, recent, future = split(slots(0))
            self.stdout.write(self.style.WARNING(
                '  注意：目前時間過早，已完成／遲到的班次被排在凌晨時段。'
                '白天時段重跑本指令會得到更貼近實況的分布。'
            ))

        # 四種狀態的配額（沒有足夠的過去時段時自動縮減）
        n_green = min(len(deep_past) // 2, max(1, total * 35 // 100))
        n_late_done = min(len(deep_past) - n_green, max(1, total * 10 // 100))
        n_red = min(max(0, len(deep_past) - n_green - n_late_done), max(1, total * 20 // 100))
        n_yellow = max(0, total - n_green - n_late_done - n_red)

        plan = (
            [('completed', t) for t in random.sample(deep_past, n_green)] if n_green else []
        )
        used = {t for _, t in plan}
        pool = [t for t in deep_past if t not in used]
        plan += [('late_completed', t) for t in random.sample(pool, min(n_late_done, len(pool)))]
        used = {t for _, t in plan}
        pool = [t for t in deep_past if t not in used]
        plan += [('late', t) for t in random.sample(pool, min(n_red, len(pool)))]
        yellow_pool = recent + future
        plan += [('pending', t) for t in random.sample(yellow_pool, min(n_yellow, len(yellow_pool)))]

        created = []
        for idx, (kind, start) in enumerate(plan):
            case = cases[idx % len(cases)]
            caregiver = caregivers[idx % len(caregivers)]
            item = items[idx % len(items)]
            end_dt = (datetime.combine(today, start) + timedelta(minutes=random.choice([30, 45, 60, 90])))
            sched_start_dt = local_datetime(today, start)

            record = ServiceRecord(
                case=case, caregiver=caregiver, service_item=item,
                scheduled_date=today,
                scheduled_start_time=start,
                scheduled_end_time=end_dt.time(),
            )

            if kind == 'completed':
                record.status = ServiceRecord.Status.COMPLETED
                record.actual_start_time = sched_start_dt + timedelta(minutes=random.randint(-5, grace - 3))
                record.actual_end_time = record.actual_start_time + timedelta(minutes=random.randint(30, 80))
                record.client_signature = True
            elif kind == 'late_completed':
                record.status = ServiceRecord.Status.COMPLETED
                record.actual_start_time = sched_start_dt + timedelta(minutes=grace + random.randint(10, 50))
                record.actual_end_time = record.actual_start_time + timedelta(minutes=random.randint(30, 70))
                record.client_signature = True
            elif kind == 'late':
                record.status = ServiceRecord.Status.PENDING  # 逾時未打卡
            else:
                record.status = ServiceRecord.Status.PENDING

            record.save()
            if record.actual_start_time:
                record.checkin_latitude = case.latitude
                record.checkin_longitude = case.longitude
                record.save(update_fields=['checkin_latitude', 'checkin_longitude'])
            created.append(record)

        summary = {}
        for kind, _ in plan:
            summary[kind] = summary.get(kind, 0) + 1
        self.stdout.write(
            f"✓ 當日班表 {len(created)} 筆："
            f"綠{summary.get('completed',0)} / 紅綠{summary.get('late_completed',0)} / "
            f"紅{summary.get('late',0)} / 黃{summary.get('pending',0)}"
        )
        return created

    # ── 5. 居服員位置 ────────────────────────────────────────
    def _place_caregivers(self, caregivers, records, now):
        CaregiverLocation.objects.all().delete()
        for i, cg in enumerate(caregivers):
            own = [r for r in records if r.caregiver_id == cg.id and r.case.latitude]
            if not own:
                continue
            anchor = max(
                (r for r in own if r.actual_start_time),
                key=lambda r: r.actual_start_time,
                default=own[0],
            )
            # 在案家附近加一點位移，模擬實際定位誤差與移動
            jitter = lambda: random.uniform(-0.004, 0.004)
            # 讓其中一位的位置刻意過舊，測試「離線」樣式
            minutes_ago = 95 if i == len(caregivers) - 1 else random.randint(1, 12)
            CaregiverLocation.objects.create(
                caregiver=cg,
                latitude=float(anchor.case.latitude) + jitter(),
                longitude=float(anchor.case.longitude) + jitter(),
                accuracy_m=random.choice([8, 12, 20, 35]),
                source=CaregiverLocation.Source.MOCK,
                recorded_at=now - timedelta(minutes=minutes_ago),
            )
        self.stdout.write(f'✓ 居服員位置 {CaregiverLocation.objects.count()} 筆（含 1 筆刻意過舊，測試離線樣式）')
