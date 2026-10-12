import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { BORDER, LINKS, MAP_SIZE, PARTS } from '../../content/world.js'
import { fitView, useViewport } from './useViewport.js'

const BY_ID = Object.fromEntries(PARTS.map((r) => [r.id, r]))
const ALL_BOX = { x: 0, y: 0, w: MAP_SIZE.w, h: MAP_SIZE.h }
// 내 위치 버튼: 핀이 있는 기관을 보이는 영역 가운데에 이 배율로 둔다
const LOCATE_K = 1
// 학습 이동: 이 배율보다 작으면 글씨를 읽기 어렵다고 보고 다시 맞춘다. EDGE 는 '보인다'고 칠 화면 가장자리 여유
const READ_K = 0.7
const EDGE = 16
const FIT_PAD = 72
const LOCK_OPEN = 'M-3.5 -1 V-5 A3.5 3.5 0 0 1 3.5 -5 V-7'
const LOCK_SHUT = 'M-3.5 -1 V-5 A3.5 3.5 0 0 1 3.5 -5 V-1'

// 이동 대상(구성요소·연결)을 모두 감싸는 상자
function boxOf(partIds, linkIds) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  const add = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
  for (const id of partIds) { const r = BY_ID[id]; if (r) { add(r.x, r.y); add(r.x + r.w, r.y + r.h) } }
  for (const h of LINKS) if (linkIds.includes(h.id)) h.pts.forEach(([x, y]) => add(x, y))
  if (x0 === Infinity) return ALL_BOX
  return { x: x0, y: y0, w: Math.max(x1 - x0, 1), h: Math.max(y1 - y0, 1) }
}

export function MePin(props) {
  return (
    <g className="me" {...props}>
      <title>지금 여기</title>
      <ellipse className="ring" rx="10" ry="4" />
      <ellipse className="ground" rx="6" ry="2.4" />
      <path className="pin" d="M0 0 C-4 -8 -14 -16 -14 -28 A14 14 0 1 1 14 -28 C14 -16 4 -8 0 0 Z" />
      <circle className="face" cx="0" cy="-28" r="9.5" />
      <circle className="eye" cx="-3.6" cy="-30" r="1.6" />
      <circle className="eye" cx="3.6" cy="-30" r="1.6" />
      <path className="smile" d="M-3.6 -25.2 Q0 -22 3.6 -25.2" />
    </g>
  )
}

export function Lock({ open, ...props }) {
  return (
    <g className={'lock' + (open ? ' unlocked' : '')} {...props}>
      <path className="shackle" d={open ? LOCK_OPEN : LOCK_SHUT} />
      <rect className="body" x="-6" y="-1" width="12" height="9" rx="2" />
    </g>
  )
}

/**
 * focus: 강조 { mode:'learn'|'select', parts:Set, links:Set, selected? } 또는 null
 * fly: 이동 요청 { key, parts:[], links:[] }. key 가 바뀔 때마다 대상(비어 있으면 지도 전체)으로 이동한다
 */
export default function MapView({ real, focus, pin, openParts, onSelect, fly, insetLeft = 0, insetBottom = 0 }) {
  const svgRef = useRef(null)
  const [size, setSize] = useState(null)
  const { view, viewRef, zoomAt, flyTo, movedRef } = useViewport(svgRef)

  useLayoutEffect(() => {
    const el = svgRef.current
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 패널(왼쪽)이나 시트(아래)가 덮은 곳을 뺀 영역. 남는 곳이 너무 좁으면 전체를 쓴다
  const area = useMemo(() => {
    if (!size) return null
    const left = size.w - insetLeft >= 280 ? insetLeft : 0
    const bottom = size.h - insetBottom >= 160 ? insetBottom : 0
    return { x: left, y: 0, w: size.w - left, h: size.h - bottom }
  }, [size, insetLeft, insetBottom])

  const flyRef = useRef(fly)
  flyRef.current = fly
  const first = useRef(true)
  useEffect(() => {
    if (!area) return
    const f = flyRef.current
    const box = f && (f.parts.length || f.links.length) ? boxOf(f.parts, f.links || []) : ALL_BOX
    if (first.current || box === ALL_BOX) {
      flyTo(fitView(box, area, box === ALL_BOX ? 24 : 72), first.current ? 0 : 650)
      first.current = false
      return
    }
    // 대상이 이미 보이고 읽을 만한 배율이면 움직이지 않는다. 지금 배율로 다 들어가면 위치만 옮긴다
    const v = viewRef.current
    const readable = v.k >= READ_K
    const sx0 = box.x * v.k + v.x, sy0 = box.y * v.k + v.y
    const sx1 = (box.x + box.w) * v.k + v.x, sy1 = (box.y + box.h) * v.k + v.y
    const inside = sx0 >= area.x + EDGE && sy0 >= area.y + EDGE && sx1 <= area.x + area.w - EDGE && sy1 <= area.y + area.h - EDGE
    if (readable && inside) return
    const fits = box.w * v.k <= area.w - FIT_PAD * 2 && box.h * v.k <= area.h - FIT_PAD * 2
    if (readable && fits) {
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2
      flyTo({ k: v.k, x: area.x + area.w / 2 - cx * v.k, y: area.y + area.h / 2 - cy * v.k }, 500)
      return
    }
    flyTo(fitView(box, area, FIT_PAD), 650)
    // 이동은 요청(key)이 바뀌거나 보이는 영역이 바뀔 때만 한다. 끌어서 옮긴 뒤 다시 그려질 때 되돌아가지 않게
  }, [fly && fly.key, area, flyTo])

  const zoomBtn = (f) => () => area && zoomAt(f, area.x + area.w / 2, area.y + area.h / 2)
  const fitAll = () => area && flyTo(fitView(ALL_BOX, area, 24), 500)
  const locate = () => {
    if (!area) return
    const r = BY_ID[pin] || BY_ID.bank
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2
    flyTo({ k: LOCATE_K, x: area.x + area.w / 2 - cx * LOCATE_K, y: area.y + area.h / 2 - cy * LOCATE_K }, 500)
  }

  const learn = focus && focus.mode === 'learn'
  const cur = BY_ID[pin] || BY_ID.bank

  return (
    <div className="map">
      <svg ref={svgRef} className="map-svg" role="img" aria-labelledby="mapT">
        <title id="mapT">{real ? '조직의 시스템 관계도. 상자는 시스템, 선은 연동' : '우리나라 관계도. 상자는 기관, 길은 기관 사이의 관계'}</title>
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          <g>
            {LINKS.map((h) => {
              const on = focus ? focus.links.has(h.id) : false
              const cls = 'hall' + (h.ext ? ' ext' : '') + (on ? ' hi' : '') + (focus && !on ? ' dim' : '')
              return <polyline key={h.id} className={cls} points={h.pts.map((q) => q.join(',')).join(' ')} />
            })}
          </g>
          <rect className="border" x={BORDER.x} y={BORDER.y} width={BORDER.w} height={BORDER.h} rx="6" />
          <text className="zone-nm" x={BORDER.x + 30} y={BORDER.y + 26}>{real ? '조직의 시스템' : '우리나라'}</text>
          <g>
            {PARTS.map((r) => {
              const isOpen = openParts.has(r.id)
              const inFocus = focus ? focus.parts.has(r.id) : false
              const cls = 'room' + (isOpen ? ' open' : '')
                + (learn && inFocus ? ' hi' : '')
                + (!learn && focus && focus.selected === r.id ? ' sel' : '')
                + (focus && !inFocus ? ' dim' : '')
              const label = real ? r.rs : r.nm
              const pick = () => { if (!movedRef.current) onSelect(r.id) }
              return (
                <g key={r.id} className={cls} tabIndex={0} role="button" aria-label={label}
                  onClick={pick}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(r.id) } }}>
                  <title>{real ? r.nm : r.r}</title>
                  <rect className="box" x={r.x} y={r.y} width={r.w} height={r.h} rx="6" />
                  <text className="nm" x={r.x + 12} y={r.y + 26}>{label}</text>
                  <Lock open={isOpen} transform={`translate(${r.x + 18} ${r.y + r.h - 20})`} />
                  {isOpen && (
                    <g className="task" transform={`translate(${r.x + r.w - 14} ${r.y + 14})`}>
                      <circle r="10" /><text x="-3.5" y="4.5">!</text>
                    </g>
                  )}
                </g>
              )
            })}
          </g>
          <MePin transform={`translate(${cur.x + cur.w - 26} ${cur.y + cur.h - 12}) scale(1.5)`} />
        </g>
      </svg>

      <div className="map-tools" role="group" aria-label="지도 조작">
        <button type="button" onClick={locate} aria-label="내 위치로" title="내 위치로" className="locate">
          <svg viewBox="-12 -12 24 24" aria-hidden="true">
            <circle r="6" /><circle r="2.5" className="core" />
            <path d="M0 -11 V-7 M0 7 V11 M-11 0 H-7 M7 0 H11" />
          </svg>
        </button>
        <button type="button" onClick={zoomBtn(1.3)} aria-label="확대">+</button>
        <button type="button" onClick={zoomBtn(1 / 1.3)} aria-label="축소">−</button>
        <button type="button" onClick={fitAll} aria-label="전체 보기" className="fit">⤢</button>
      </div>
    </div>
  )
}
