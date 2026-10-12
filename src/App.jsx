import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { LINKS, PART_BY_ID, PARTS, UNITS, stageOpen, stepAt, unitTitle } from './content.js'
import MapView from './map/MapView.jsx'
import BottomSheet, { snapHeights } from './panel/BottomSheet.jsx'
import Learning from './panel/Learning.jsx'
import { Home, PartInfo } from './panel/Nav.jsx'
import { SearchBar, SearchResults } from './panel/Search.jsx'
import Toc from './panel/Toc.jsx'
import { loadProgress, saveProgress } from './progress.js'

const HOME = 'bank'
const MOBILE = '(max-width: 767px)'
// 지금은 학습 단위에 나오는 구성요소가 열린 것이다
const OPEN_PARTS = new Set(UNITS.flatMap((u) => u.parts))

// 창 크기: 폭이 좁으면 바닥 시트, 넓으면 왼쪽 패널
function useWindow() {
  const read = () => ({ mobile: window.matchMedia(MOBILE).matches, vh: window.innerHeight })
  const [w, setW] = useState(read)
  useEffect(() => {
    const on = () => setW(read())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return w
}

export default function App() {
  const { mobile, vh } = useWindow()
  const [realToggle, setRealToggle] = useState(false)
  const [selected, setSelected] = useState(null)
  const [learning, setLearning] = useState(false)
  const [panelOpen, setPanelOpen] = useState(true)
  const [snap, setSnap] = useState('peek')
  const [q, setQ] = useState('')
  const [tocOpen, setTocOpen] = useState(false)
  const [notice, setNotice] = useState(null)
  const [flyReq, setFlyReq] = useState({ key: 0, parts: [], links: [] })
  const [progress, setProgress] = useState(() => loadProgress(UNITS))
  const [panelW, setPanelW] = useState(0)
  const panelRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => { saveProgress(progress) }, [progress])

  useLayoutEffect(() => {
    if (mobile || !panelRef.current) return
    const ro = new ResizeObserver(([e]) => setPanelW(e.contentRect.width))
    ro.observe(panelRef.current)
    return () => ro.disconnect()
  }, [mobile])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 2600)
    return () => clearTimeout(t)
  }, [notice])

  const ui = Math.max(0, UNITS.findIndex((u) => u.id === progress.unit))
  const unit = UNITS[ui]
  const up = progress.units[unit.id]
  const stage = unit.stages[up.stage]
  const at = stepAt(stage, up.step)
  // 학습 중에는 "실제로는" 카드와 테스트에서 보안 관계도로 바뀐다
  const real = learning ? at.kind === 'test' || (at.kind === 'card' && !!at.card.real) : realToggle

  const setUp = useCallback((fn) => {
    setProgress((p) => ({ ...p, units: { ...p.units, [unit.id]: fn(p.units[unit.id]) } }))
  }, [unit.id])

  // 모바일: 카드가 바뀌면 지도와 본문이 함께 보이게 반 높이로, 테스트는 입력이 많아 전체로. 검색 중에는 전체로
  useEffect(() => {
    if (mobile && learning) setSnap(at.kind === 'test' ? 'full' : 'half')
  }, [mobile, learning, unit.id, up.stage, up.step, at.kind])
  useEffect(() => { if (mobile && q) setSnap('full') }, [mobile, q])

  // 이동: 학습 위치 / 구성요소 하나 / 목차·검색에서 연 단계
  const goStep = useCallback(({ ui: tui, si, step }) => {
    const u = UNITS[tui]
    setProgress((p) => {
      if (!stageOpen(u, p.units[u.id], si)) return p
      return { unit: u.id, units: { ...p.units, [u.id]: { ...p.units[u.id], stage: si, step } } }
    })
    if (!stageOpen(u, progress.units[u.id], si)) {
      setNotice('앞 단계의 확인 테스트를 통과하면 열립니다.')
      return
    }
    setLearning(true); setSelected(null); setQ(''); setTocOpen(false); setPanelOpen(true)
  }, [progress])
  const goUnit = (tui) => { const u = UNITS[tui], s = progress.units[u.id]; goStep({ ui: tui, si: s.stage, step: s.step }) }
  const goPart = (id) => {
    setLearning(false); setSelected(id); setQ(''); setTocOpen(false); setPanelOpen(true)
    setFlyReq((f) => ({ key: f.key + 1, parts: [id], links: [] }))
    setSnap((s) => (s === 'peek' ? 'half' : s))
  }
  const closeLearning = () => {
    setLearning(false); setSnap('peek')
    setFlyReq((f) => ({ key: f.key + 1, parts: [], links: [] }))
  }
  const pick = (id) => {
    if (learning) return
    setSelected((s) => (s === id ? null : id))
    setPanelOpen(true)
    setSnap((s) => (s === 'peek' ? 'half' : s))
  }

  const focus = useMemo(() => {
    if (learning) {
      const f = (at.kind === 'card' && at.card.focus) || stage.focus
      return { mode: 'learn', parts: new Set(f.parts || []), links: new Set(f.links || []) }
    }
    if (!selected) return null
    const links = LINKS.filter((h) => h.a === selected || h.b === selected)
    const parts = new Set([selected])
    links.forEach((h) => { parts.add(h.a); parts.add(h.b) })
    return { mode: 'select', selected, parts, links: new Set(links.map((h) => h.id)) }
  }, [learning, at, stage, selected])

  const fly = useMemo(() => {
    if (!learning) return { key: 'r' + flyReq.key, parts: flyReq.parts, links: flyReq.links }
    const f = (at.kind === 'card' && at.card.focus) || stage.focus
    return { key: `l-${unit.id}-${up.stage}-${up.step}`, parts: f.parts || [], links: f.links || [] }
  }, [learning, flyReq, at, stage, unit.id, up.stage, up.step])

  const pin = learning ? stage.focus.pin : HOME
  const insetLeft = !mobile && panelOpen ? panelW : 0
  const insetBottom = mobile ? snapHeights(vh)[snap] : 0

  const home = PART_BY_ID[pin]
  const head = (
    <header className="phead">
      <h1>{real ? '보안 관계도' : '일상 관계도'}</h1>
      <div className="progress">
        <span>대상 <b>{real ? home.rs : home.nm}</b></span>
        <span>주제 <b>{unitTitle(unit)}</b></span>
        <span className="pbar"><span style={{ width: Math.round(OPEN_PARTS.size / PARTS.length * 100) + '%' }} /></span>
        <span>진행 {OPEN_PARTS.size} / {PARTS.length}</span>
      </div>
    </header>
  )
  const body = q
    ? <SearchResults q={q} real={real} progress={progress} onPart={goPart} onUnit={goUnit} onGo={goStep} />
    : learning
      ? <Learning unit={unit} up={up} setUp={setUp} onClose={closeLearning} />
      : selected
        ? <PartInfo id={selected} real={real} openParts={OPEN_PARTS} progress={progress} onGo={goStep} onPart={goPart} />
        : <Home real={real} progress={progress} onGo={goStep} onUnit={goUnit} />
  const searchBar = <SearchBar q={q} setQ={setQ} onToc={() => setTocOpen(true)} inputRef={searchRef} />

  return (
    <div className={'app' + (mobile ? ' mobile' : '')} style={{ '--inset-b': insetBottom + 'px' }}>
      <MapView real={real} focus={focus} pin={pin} openParts={OPEN_PARTS}
        onSelect={pick} fly={fly} insetLeft={insetLeft} insetBottom={insetBottom} />

      {mobile && <div className="float-search">{searchBar}</div>}

      <div className="seg" role="group" aria-label="보기 전환">
        <button type="button" aria-pressed={!real} disabled={learning} onClick={() => setRealToggle(false)}>일상 관계도</button>
        <button type="button" aria-pressed={real} disabled={learning} onClick={() => setRealToggle(true)}>보안 관계도</button>
      </div>

      {mobile ? (
        <BottomSheet vh={vh} snap={snap} onSnap={setSnap} head={head}>{body}</BottomSheet>
      ) : (
        <aside ref={panelRef} className={'panel' + (panelOpen ? '' : ' folded')} aria-label="설명">
          <div className="panel-inner" inert={panelOpen ? undefined : true}>
            <div className="panel-top">{searchBar}</div>
            <div className="panel-scroll">
              {head}
              {body}
            </div>
          </div>
          <button type="button" className="panel-tab" aria-expanded={panelOpen}
            aria-label={panelOpen ? '설명 패널 접기' : '설명 패널 펼치기'} onClick={() => setPanelOpen((o) => !o)}>
            <span aria-hidden="true">{panelOpen ? '‹' : '›'}</span>
          </button>
        </aside>
      )}

      <Toc open={tocOpen} onClose={() => setTocOpen(false)} progress={progress}
        current={learning ? { ui, si: up.stage, step: up.step } : null} onGo={goStep} />

      {notice && <div className="notice" role="status">{notice}</div>}

      <div className="legend">
        <span><i className="sw" />{real ? '연동' : '연결'}</span>
        <span><i className="sw dot-open" />열림</span>
        <span><i className="sw dot-task" />학습</span>
      </div>
    </div>
  )
}
