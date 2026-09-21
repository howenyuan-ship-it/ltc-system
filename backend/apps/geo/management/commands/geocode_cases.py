"""把個案居住地址與機構據點地址轉成經緯度。

    python manage.py geocode_cases                 # 只補還沒有座標的
    python manage.py geocode_cases --all           # 全部重新定位（仍保護人工座標）
    python manage.py geocode_cases --no-fallback   # 沒有真實定位就跳過
    python manage.py geocode_cases --all --include-manual  # 連人工點選的也覆蓋

人工在地圖上點選的座標（geocode_source='manual'）通常比定位服務算出來的
門牌中心點更貼近實際門口，所以預設一律不覆蓋。
"""
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import Organization
from apps.cases.models import Case
from apps.geo.geocoding import geocode


class Command(BaseCommand):
    help = '依地址為個案與服務據點建立經緯度座標'

    def add_arguments(self, parser):
        parser.add_argument('--all', action='store_true', help='連已有座標的一併重新定位')
        parser.add_argument('--no-fallback', action='store_true', help='沒有真實定位結果就跳過，不寫入假座標')
        parser.add_argument('--include-manual', action='store_true', help='連人工點選的座標也一併覆蓋（預設保護）')

    def handle(self, *args, **options):
        redo_all = options['all']
        allow_fallback = not options['no_fallback']
        include_manual = options['include_manual']

        cases = Case.objects.all() if redo_all else Case.objects.filter(latitude__isnull=True)
        protected = 0
        if not include_manual:
            protected = cases.filter(geocode_source='manual').count()
            cases = cases.exclude(geocode_source='manual')

        done = skipped = fallback_count = 0

        for case in cases:
            address = case.full_address
            if not address:
                skipped += 1
                continue
            result = geocode(address, allow_fallback=allow_fallback)
            if not result:
                skipped += 1
                self.stdout.write(self.style.WARNING(f'  ✗ 無法定位: {case.name} / {address}'))
                continue
            case.latitude = result.latitude
            case.longitude = result.longitude
            case.geocoded_at = timezone.now()
            case.geocode_source = result.source
            case.save(update_fields=['latitude', 'longitude', 'geocoded_at', 'geocode_source'])
            done += 1
            if not result.is_real:
                fallback_count += 1

        orgs = Organization.objects.all() if redo_all else Organization.objects.filter(latitude__isnull=True)
        org_done = 0
        for org in orgs:
            if not org.address:
                continue
            result = geocode(org.address, allow_fallback=allow_fallback)
            if not result:
                continue
            org.latitude = result.latitude
            org.longitude = result.longitude
            org.save(update_fields=['latitude', 'longitude'])
            org_done += 1
            if not result.is_real:
                fallback_count += 1

        self.stdout.write(self.style.SUCCESS(f'個案定位完成 {done} 筆、據點 {org_done} 筆、跳過 {skipped} 筆'))
        if protected:
            self.stdout.write(f'  保留人工設定的座標 {protected} 筆（要覆蓋請加 --include-manual）')
        if fallback_count:
            self.stdout.write(self.style.WARNING(
                f'其中 {fallback_count} 筆使用 fallback 假座標（尚未設定 TGOS_APP_ID / TGOS_APP_KEY）'
            ))
