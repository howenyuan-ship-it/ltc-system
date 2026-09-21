"""台灣地址完整度判定。

定位服務有個危險的特性：地址不完整時它仍然會回傳一個看起來合理的座標。
「台南市東區林森路」會得到整條路的中心點，「台南市東區」會得到整個行政區的
中心點——地圖上畫出來都是一個精確的圖釘，督導看不出差別，但居服員照著去
會找不到人。

所以定位之前必須先判斷地址夠不夠精確，不夠的一律不給座標，讓它在畫面上
以「未定位」現形，而不是給一個錯的點。
"""
from __future__ import annotations

import re
from dataclasses import dataclass

# 完整：帶門牌號碼。涵蓋 149號 / 149之2號 / 149-2號 / 149 號
HOUSE_NUMBER = re.compile(r'\d+\s*(?:[之\-]\s*\d+)?\s*號')

# 僅到路段：有道路層級的字詞但沒有門牌號
ROAD_LEVEL = re.compile(r'[路街道]|大道|[段巷弄]|產業道路')

# 僅到行政區：只有縣市鄉鎮村里
DISTRICT_LEVEL = re.compile(r'[縣市區鄉鎮村里]')

COMPLETE = 'complete'
PARTIAL = 'partial'
DISTRICT = 'district'
EMPTY = 'empty'

LABELS = {
    COMPLETE: '地址完整',
    PARTIAL: '缺門牌號碼',
    DISTRICT: '僅到行政區',
    EMPTY: '未填地址',
}

# 只有 complete 才允許自動定位；其餘一律要人工在地圖上指定
GEOCODABLE = {COMPLETE}


@dataclass(frozen=True)
class AddressQuality:
    level: str
    label: str

    @property
    def is_geocodable(self) -> bool:
        return self.level in GEOCODABLE

    @property
    def is_complete(self) -> bool:
        return self.level == COMPLETE


def classify(address: str | None) -> AddressQuality:
    """判斷地址精確到哪一層。"""
    text = (address or '').strip()
    if not text:
        return AddressQuality(EMPTY, LABELS[EMPTY])
    if HOUSE_NUMBER.search(text):
        return AddressQuality(COMPLETE, LABELS[COMPLETE])
    if ROAD_LEVEL.search(text):
        return AddressQuality(PARTIAL, LABELS[PARTIAL])
    if DISTRICT_LEVEL.search(text):
        return AddressQuality(DISTRICT, LABELS[DISTRICT])
    return AddressQuality(PARTIAL, LABELS[PARTIAL])
