import { useCallback, useEffect, useRef, useState } from 'react'

// 지도 이동·확대. 화면 좌표 = 지도 좌표 * k + (x, y)
// 끌기(마우스·한 손가락), 휠 확대, 두 손가락 확대, 목표 영역으로 부드럽게 이동(flyTo)
const MIN_K = 0.3
const MAX_K = 3
const clampK = (k) => Math.min(MAX_K, Math.max(MIN_K, k))
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function useViewport(elRef) {
  const [view, setViewState] = useState({ k: 1, x: 0, y: 0 })
  const viewRef = useRef(view)
  const animRef = useRef(0)
  const movedRef = useRef(false)

  const setView = useCallback((v) => { viewRef.current = v; setViewState(v) }, [])
  const stopAnim = useCallback(() => { cancelAnimationFrame(animRef.current); animRef.current = 0 }, [])

  const zoomAt = useCallback((factor, px, py) => {
    stopAnim()
    const v = viewRef.current
    const k = clampK(v.k * factor)
    const wx = (px - v.x) / v.k, wy = (py - v.y) / v.k
    setView({ k, x: px - wx * k, y: py - wy * k })
  }, [setView, stopAnim])

  const flyTo = useCallback((target, ms = 600) => {
    stopAnim()
    const to = { ...target, k: clampK(target.k) }
    if (reducedMotion() || ms <= 0) { setView(to); return }
    const from = viewRef.current
    const t0 = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / ms), e = ease(t)
      setView({ k: from.k + (to.k - from.k) * e, x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e })
      animRef.current = t < 1 ? requestAnimationFrame(tick) : 0
    }
    animRef.current = requestAnimationFrame(tick)
  }, [setView, stopAnim])

  useEffect(() => {
    const el = elRef.current
    if (!el) return
    const pts = new Map()
    let start = null

    const local = (e) => { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
    const snapshot = () => {
      const v = viewRef.current
      const ps = [...pts.values()]
      if (ps.length >= 2) {
        const [a, b] = ps
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        return { v, mid, dist: Math.hypot(a.x - b.x, a.y - b.y) || 1 }
      }
      return { v, p: ps[0] }
    }

    const onMove = (e) => {
      if (!pts.has(e.pointerId)) return
      const p = local(e)
      pts.set(e.pointerId, p)
      const ps = [...pts.values()]
      if (ps.length >= 2 && start.mid) {
        const [a, b] = ps
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        const k = clampK(start.v.k * (Math.hypot(a.x - b.x, a.y - b.y) / start.dist))
        const wx = (start.mid.x - start.v.x) / start.v.k, wy = (start.mid.y - start.v.y) / start.v.k
        movedRef.current = true
        setView({ k, x: mid.x - wx * k, y: mid.y - wy * k })
      } else if (start.p) {
        const dx = p.x - start.p.x, dy = p.y - start.p.y
        if (!movedRef.current && Math.hypot(dx, dy) < 4) return
        movedRef.current = true
        setView({ k: start.v.k, x: start.v.x + dx, y: start.v.y + dy })
      }
    }
    let lastTap = null
    const onUp = (e) => {
      pts.delete(e.pointerId)
      // 두 번 탭(두 번 클릭)하면 그 자리를 중심으로 확대한다
      if (pts.size === 0 && !movedRef.current && start && start.p) {
        const now = performance.now(), p = start.p
        if (lastTap && now - lastTap.t < 300 && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 30) {
          const v = viewRef.current, k = clampK(v.k * 1.8)
          const wx = (p.x - v.x) / v.k, wy = (p.y - v.y) / v.k
          flyTo({ k, x: p.x - wx * k, y: p.y - wy * k }, 250)
          lastTap = null
        } else {
          lastTap = { t: now, x: p.x, y: p.y }
        }
      }
      if (pts.size === 0) {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
        start = null
      } else {
        start = snapshot()
      }
    }
    const onDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return
      stopAnim()
      if (pts.size === 0) {
        movedRef.current = false
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
        window.addEventListener('pointercancel', onUp)
      }
      pts.set(e.pointerId, local(e))
      start = snapshot()
    }
    const onWheel = (e) => {
      e.preventDefault()
      const p = local(e)
      zoomAt(Math.exp(-e.deltaY * 0.0015), p.x, p.y)
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('wheel', onWheel)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      stopAnim()
    }
  }, [elRef, setView, stopAnim, zoomAt, flyTo])

  return { view, viewRef, zoomAt, flyTo, movedRef }
}

// 지도 좌표의 상자(box)를 화면의 보이는 영역(area)에 맞추는 view
export function fitView(box, area, pad = 48, maxK = 1.3) {
  const aw = Math.max(1, area.w - pad * 2), ah = Math.max(1, area.h - pad * 2)
  const k = clampK(Math.min(aw / box.w, ah / box.h, maxK))
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2
  return { k, x: area.x + area.w / 2 - cx * k, y: area.y + area.h / 2 - cy * k }
}
