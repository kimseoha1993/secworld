import { useMemo } from 'react'
import { NAMES, PART_BY_ID, UNITS, search, unitTitle } from '../content.js'
import { CardLink } from './Nav.jsx'

// 검색창: [목차] [입력] [지우기]. 안내 문구는 넣지 않고 이름표(aria-label)로만 알린다
export function SearchBar({ q, setQ, onToc, inputRef }) {
  return (
    <div className="searchbar" role="search">
      <button type="button" className="sb-btn" onClick={onToc} aria-label="목차 열기">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
      <input ref={inputRef} type="search" value={q} aria-label="구성요소, 주제, 카드 검색"
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') setQ('') }} />
      {q
        ? <button type="button" className="sb-btn" onClick={() => setQ('')} aria-label="검색어 지우기">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        : <span className="sb-btn sb-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6" /><path d="M16 16l4 4" /></svg>
          </span>}
    </div>
  )
}

export function SearchResults({ q, real, progress, onPart, onUnit, onGo }) {
  const res = useMemo(() => search(q), [q])
  const n = res.part.length + res.topic.length + res.card.length
  if (!n) return <section className="info"><p className="hint">"{q}"에 맞는 결과가 없습니다.</p></section>
  return (
    <section className="info results" aria-live="polite">
      {res.part.length > 0 && (
        <>
          <div className="kick">{NAMES.part(real)} {res.part.length}</div>
          <ul className="golist">
            {res.part.map((e) => {
              const p = PART_BY_ID[e.id]
              return (
                <li key={e.id}>
                  <button type="button" className="golink" onClick={() => onPart(e.id)}>
                    <span className="gl-main">{real ? p.rs : p.nm}</span>
                    <span className="gl-sub">{real ? p.r : p.nm + ' · ' + p.r}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
      {res.topic.length > 0 && (
        <>
          <div className="kick">{NAMES.topic} {res.topic.length}</div>
          <ul className="golist">
            {res.topic.map((e) => (
              <li key={e.ui}>
                <button type="button" className="golink" onClick={() => onUnit(e.ui)}>
                  <span className="gl-main">{unitTitle(UNITS[e.ui])}</span>
                  <span className="gl-sub">{UNITS[e.ui].stages.map((s) => s.label).join(' · ')}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {res.card.length > 0 && (
        <>
          <div className="kick">{NAMES.card} {res.card.length}</div>
          <ul className="golist">
            {res.card.map((e) => <CardLink key={e.id} id={e.id} progress={progress} onGo={onGo} hit={e.hit} />)}
          </ul>
        </>
      )}
    </section>
  )
}
