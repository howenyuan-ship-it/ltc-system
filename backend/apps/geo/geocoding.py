"""地址 → 經緯度。

主要供應商為內政部 TGOS 全國門牌地址定位服務（台灣地址辨識率最佳）。
未設定金鑰時退回 fallback：以地址字串的雜湊在台南市區範圍內產生
「決定性」的假座標 —— 同一個地址永遠得到同一個點，方便開發與 demo，
但明確標記 source='fallback'，不會被誤認為真實定位。
"""
from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from decimal import Decimal
from typing import Optional

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

TGOS_ENDPOINT = 'https://gis.tgos.tw/TGAPI/Service/Address/TGAddressJsonService.asmx/GetAddressAsJson'
REQUEST_TIMEOUT = 8


@dataclass(frozen=True)
class GeocodeResult:
    latitude: Decimal
    longitude: Decimal
    source: str
    matched_address: str = ''

    @property
    def is_real(self) -> bool:
        return self.source != 'fallback'


def _quantize(value: float) -> Decimal:
    return Decimal(str(round(value, 6)))


def _fallback(address: str) -> GeocodeResult:
    """用地址雜湊產生決定性的假座標（台南市區範圍內）。"""
    bounds = settings.GEOCODE_FALLBACK_BOUNDS
    digest = hashlib.sha256(address.encode('utf-8')).digest()
    # 取兩段互不重疊的位元組，避免經緯度相關
    lat_frac = int.from_bytes(digest[0:4], 'big') / 0xFFFFFFFF
    lng_frac = int.from_bytes(digest[4:8], 'big') / 0xFFFFFFFF
    lat = bounds['lat_min'] + lat_frac * (bounds['lat_max'] - bounds['lat_min'])
    lng = bounds['lng_min'] + lng_frac * (bounds['lng_max'] - bounds['lng_min'])
    return GeocodeResult(_quantize(lat), _quantize(lng), 'fallback', address)


def _tgos(address: str) -> Optional[GeocodeResult]:
    """呼叫 TGOS。失敗時回 None，由呼叫端決定是否 fallback。"""
    params = {
        'oAPPId': settings.TGOS_APP_ID,
        'oAPIKey': settings.TGOS_APP_KEY,
        'oAddress': address,
        'oSRS': 'EPSG:4326',      # 回傳 WGS84 經緯度
        'oFuzzyType': '2',        # 模糊比對：允許門牌號碼些微差異
        'oResultDataType': 'JSON',
        'oFuzzyBuffer': '0',
        'oIsOnlyFullMatch': 'false',
        'oIsLockCounty': 'true',
        'oIsLockTown': 'false',
        'oIsSupportPast': 'true',
        'oIsShowCodeBase': 'false',
        'oIsLockVillage': 'false',
        'oIsLockRoadSection': 'false',
        'oIsLockLane': 'false',
        'oIsLockAlley': 'false',
        'oIsLockArea': 'false',
        'oIsSameNumber_SubNumber': 'true',
        'oCanIgnoreVillage': 'true',
        'oCanIgnoreNeighborhood': 'true',
        'oReturnMaxCount': '1',
    }
    try:
        resp = requests.get(TGOS_ENDPOINT, params=params, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
    except (requests.RequestException, ValueError) as exc:
        logger.warning('TGOS 定位失敗 address=%s err=%s', address, exc)
        return None

    infos = (data or {}).get('AddressList') or []
    if not infos:
        logger.info('TGOS 查無此地址: %s', address)
        return None

    first = infos[0]
    try:
        lng = float(first['X'])
        lat = float(first['Y'])
    except (KeyError, TypeError, ValueError):
        logger.warning('TGOS 回傳格式非預期: %s', first)
        return None

    return GeocodeResult(_quantize(lat), _quantize(lng), 'tgos', first.get('FULL_ADDR', address))


def geocode(address: str, *, allow_fallback: bool = True) -> Optional[GeocodeResult]:
    """把地址轉成座標。

    allow_fallback=False 時，沒有真實定位就回 None（正式環境應該這樣用，
    避免把假座標寫進資料庫）。
    """
    address = (address or '').strip()
    if not address:
        return None

    if settings.TGOS_APP_ID and settings.TGOS_APP_KEY:
        result = _tgos(address)
        if result:
            return result

    if allow_fallback:
        return _fallback(address)
    return None
