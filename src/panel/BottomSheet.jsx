import { useEffect, useRef, useState } from 'react'

// 모바일 바닥 시트. 높이는 세 단계(peek·half·full)에 붙고, 머리(손잡이)나 내용을 끌어 옮긴다
// full 일 때만 내용이 스크롤되고, 내용이 맨 위에서 아래로 끌면 시트가 내려간다 (구글 지도 방식)
export const SNAPS = ['peek', 'half', 'full']
const PEEK = 150
const TOP_GAP = 56
const FLICK = 0.5 // px/ms 이상으로 튕기면 그 방향의 다음 단계로

export function snapHeights(vh) {
  return { peek: Math.min(PEEK, vh * 0.4), half: Math.round(vh * 0.5), full: Math.max(vh - TOP_GAP, PEEK) }
}

function nextSnap(H, cur, v) {
  if (v > FLICK) return SNAPS.find((k) => H[k] > cur + 8) || 'full'
  if (v < -FLICK) return [...SNAPS].reverse().find((k) => H[k] < cur - 8) || 'peek'
  return SNAPS.reduce((best, k) => (Math.abs(H[k] - cur) < Math.abs(H[best] - cur) ? k : best), 'peek')
}

export default function BottomSheet({ vh, snap, onSnap, head, children }) {
  const [drag, setDrag] = useState(null) // 끄는 중의 높이(px). 손을 떼면 null
  const bodyRef = useRef(null)
  const g = useRef(null) // 끌기 상태 { y0, h0, h, moved, samples }
  const live = useRef({}) // 이벤트 처리기가 읽는 최신 값
  const H = snapHeights(vh)
  live.current = { H, snap, onSnap }

  // 끌기 세 단계. 이벤트 종류(포인터·터치)와 상관없이 같은 것을 쓴다
  const drv = useRef(null)
  if (!drv.current) {
    drv.current = {
      begin(y) {
        const { H, snap } = live.current
        g.current = { y0: y, h0: H[snap], h: H[snap], moved: false, samples: [{ y, t: performance.now() }] }
      },
      move(y) {
        const s = g.current
        if (!s) return
        if (!s.moved && Math.abs(y - s.y0) < 6) return
        const { H } = live.current
        s.moved = true
        s.samples.push({ y, t: performance.now() })
        if (s.samples.length > 5) s.samples.shift()
        s.h = Math.min(H.full, Math.max(H.peek * 0.6, s.h0 - (y - s.y0)))
        setDrag(s.h)
      },
      end() {
        const s = g.current
        g.current = null
        if (!s || !s.moved) return false
        const a = s.samples[0], b = s.samples[s.samples.length - 1]
        const v = b.t > a.t ? (a.y - b.y) / (b.t - a.t) : 0 // 위로 끌면 +
        setDrag(null)
        live.current.onSnap(nextSnap(live.current.H, s.h, v))
        return true
      },
    }
  }
  const d = drv.current
  const full = snap === 'full'

  // 머리와, full 이 아닐 때의 내용: 포인터로 끈다. 끌었으면 이어지는 클릭은 무시한다
  const dragged = useRef(false)
  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    dragged.current = false
    d.begin(e.clientY)
    const mv = (ev) => d.move(ev.clientY)
    const up = () => {
      dragged.current = d.end()
      window.removeEventListener('pointermove', mv)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    window.addEventListener('pointermove', mv)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }
  const onClickCapture = (e) => { if (dragged.current) { dragged.current = false; e.stopPropagation(); e.preventDefault() } }

  // full 일 때 내용: 맨 위에서 아래로 끄는 손가락만 시트를 내리고, 그 밖에는 내용이 스크롤된다
  useEffect(() => {
    const el = bodyRef.current
    if (!el || !full) return
    let state = null // null | 'wait' | 'pull' | 'scroll'
    let y0 = 0
    const ts = (e) => { y0 = e.touches[0].clientY; state = el.scrollTop <= 0 ? 'wait' : 'scroll' }
    const tm = (e) => {
      const y = e.touches[0].clientY
      if (state === 'wait') {
        if (y > y0) { state = 'pull'; d.begin(y0) } else if (y < y0) state = 'scroll'
      }
      if (state === 'pull') { e.preventDefault(); d.move(y) }
    }
    const te = () => { if (state === 'pull') d.end(); state = null }
    el.addEventListener('touchstart', ts, { passive: true })
    el.addEventListener('touchmove', tm, { passive: false })
    el.addEventListener('touchend', te)
    el.addEventListener('touchcancel', te)
    return () => {
      el.removeEventListener('touchstart', ts)
      el.removeEventListener('touchmove', tm)
      el.removeEventListener('touchend', te)
      el.removeEventListener('touchcancel', te)
    }
  }, [full, d])

  const height = drag ?? H[snap]
  const cycle = () => onSnap(snap === 'peek' ? 'half' : snap === 'half' ? 'full' : 'peek')

  return (
    <aside className={'sheet' + (drag !== null ? ' dragging' : '')} aria-label="설명"
      style={{ height: H.full, transform: `translateY(${H.full - height}px)` }}>
      <div className="sheet-head" onPointerDown={onPointerDown} onClickCapture={onClickCapture}>
        <button type="button" className="sheet-handle" onClick={cycle}
          aria-label={full ? '설명 시트 내리기' : '설명 시트 올리기'}>
          <span aria-hidden="true" />
        </button>
        {head}
      </div>
      <div ref={bodyRef} className={'sheet-body' + (full ? ' scroll' : '')}
        onPointerDown={full ? undefined : onPointerDown} onClickCapture={onClickCapture}>
        {children}
      </div>
    </aside>
  )
}
