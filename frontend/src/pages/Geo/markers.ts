import L from 'leaflet'

import { CAREGIVER_COLOR, SITE_COLOR, STATUS_META } from './types'
import type { MapStatus } from './types'

/**
 * 自製 divIcon 標記。
 * 不用 Leaflet 內建圖示，因為打包後圖片路徑會失效；
 * 直接以 inline SVG 產生，順便讓四種狀態的顏色完全可控。
 */

function pinSvg(fill: string, secondFill?: string): string {
  // 遲到後完成用左紅右綠的雙色水滴，一眼看出「遲到了但有補做」
  const paint = secondFill
    ? `<defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="0">
         <stop offset="50%" stop-color="${fill}"/><stop offset="50%" stop-color="${secondFill}"/>
       </linearGradient></defs>`
    : ''
  const body = secondFill ? 'url(#g)' : fill
  return `
    <svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
      ${paint}
      <path d="M13 0C5.8 0 0 5.8 0 13c0 9.2 13 21 13 21s13-11.8 13-21C26 5.8 20.2 0 13 0z"
            fill="${body}" stroke="#ffffff" stroke-width="2"/>
      <circle cx="13" cy="13" r="4.5" fill="#ffffff"/>
    </svg>`
}

function dotSvg(fill: string, stale: boolean): string {
  const opacity = stale ? 0.45 : 1
  return `
    <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" opacity="${opacity}">
      <circle cx="15" cy="15" r="13" fill="${fill}" fill-opacity="0.22"/>
      <circle cx="15" cy="15" r="7.5" fill="${fill}" stroke="#ffffff" stroke-width="2.5"/>
    </svg>`
}

function squareSvg(fill: string): string {
  return `
    <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="22" height="22" rx="5" fill="${fill}" stroke="#ffffff" stroke-width="2"/>
      <path d="M8 17v-5l5-4 5 4v5z" fill="#ffffff"/>
    </svg>`
}

function makeIcon(html: string, size: [number, number], anchor: [number, number], className: string) {
  return L.divIcon({
    html,
    className,
    iconSize: size,
    iconAnchor: anchor,
    popupAnchor: [0, -anchor[1] + 4],
  })
}

const caseIconCache = new Map<string, L.DivIcon>()

/** 個案居家位置：依當日服務狀態決定顏色 */
export function caseIcon(status: MapStatus, highlighted = false): L.DivIcon {
  const key = `${status}-${highlighted}`
  const cached = caseIconCache.get(key)
  if (cached) return cached

  const html =
    status === 'late_completed'
      ? pinSvg('#dc2626', '#16a34a')
      : pinSvg(STATUS_META[status].color)

  const icon = makeIcon(
    html,
    [26, 34],
    [13, 34],
    highlighted ? 'ltc-pin ltc-pin-active' : 'ltc-pin',
  )
  caseIconCache.set(key, icon)
  return icon
}

/** 居服員目前位置：藍色圓點，定位過舊時淡化 */
export function caregiverIcon(stale: boolean): L.DivIcon {
  return makeIcon(dotSvg(CAREGIVER_COLOR, stale), [30, 30], [15, 15], 'ltc-dot')
}

/** 服務據點 */
export function siteIcon(): L.DivIcon {
  return makeIcon(squareSvg(SITE_COLOR), [26, 26], [13, 13], 'ltc-site')
}
