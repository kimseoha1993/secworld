import { CARD_AT, CARDS_BY_PART, LINKS, NAMES, PART_BY_ID, UNITS, stageOpen, stepAt, unitTitle } from '../content.js'

// 카드로 가는 줄. 잠긴 단계의 카드는 잠김으로 보이고, 눌러도 안내만 한다
export function CardLink({ id, progress, onGo, hit }) {
  const at = CARD_AT[id]
  const u = UNITS[at.ui]
  const open = stageOpen(u, progress.units[u.id], at.si)
  return (
    <li>
      <button type="button" className={'golink' + (open ? '' : ' locked')} onClick={() => onGo({ ui: at.ui, si: at.si, step: at.step })}>
        <span className="gl-main">{at.card.title}</span>
        <span className="gl-sub">
          {unitTitle(u)} · {at.card.label}
          {hit && hit !== at.card.title && hit !== at.card.label ? <> · <mark>{hit}</mark></> : null}
          {!open && <span className="lock-tag">잠김</span>}
        </span>
      </button>
    </li>
  )
}

// 구성요소를 고르지 않았을 때의 첫 화면: 이어서 하기와 주제 목록
export function Home({ real, progress, onGo, onUnit }) {
  const ui = Math.max(0, UNITS.findIndex((u) => u.id === progress.unit))
  const u = UNITS[ui]
  const up = progress.units[u.id]
  const stage = u.stages[up.stage]
  const at = stepAt(stage, up.step)
  const where = at.kind === 'scene' ? '장면' : at.kind === 'test' ? '확인 테스트' : at.card.label
  return (
    <section className="info">
      <div className="kick">이어서 하기</div>
      <button type="button" className="resume" onClick={() => onGo({ ui, si: up.stage, step: up.step })}>
        <b>{unitTitle(u)}</b>
        <span>{stage.label} · {where}</span>
      </button>

      <div className="kick">{NAMES.topic}</div>
      <ul className="golist">
        {UNITS.map((x, i) => {
          const done = x.stages.filter((s) => progress.units[x.id].done[s.id]).length
          return (
            <li key={x.id}>
              <button type="button" className="golink" onClick={() => onUnit(i)}>
                <span className="gl-main">{unitTitle(x)}</span>
                <span className="gl-sub">통과 {done} / {x.stages.length} 단계</span>
              </button>
            </li>
          )
        })}
      </ul>

      <p className="hint">지도에서 {NAMES.part(real)}을 누르면 하는 일과 {NAMES.link(real)}이 보입니다.</p>
    </section>
  )
}

// 구성요소 하나의 설명, 이어진 구성요소, 나오는 카드
export function PartInfo({ id, real, openParts, progress, onGo, onPart }) {
  const r = PART_BY_ID[id]
  const isOpen = openParts.has(r.id)
  const rels = LINKS.filter((h) => h.a === r.id || h.b === r.id)
  const cards = CARDS_BY_PART[r.id] || []
  return (
    <section className="info">
      <div className="kick">{real ? (r.out ? '외부' : '조직 내부') : (r.out ? '바깥' : '우리나라의 기관')}</div>
      <h2>{real ? r.r : r.nm} <span className={'chip' + (isOpen ? ' open' : '')}>{isOpen ? '열림' : '잠김'}</span></h2>
      <p>{real ? r.rd : r.d}</p>
      {rels.length > 0 && (
        <>
          <div className="kick">{NAMES.link(real)}된 곳</div>
          <ul className="rel">
            {rels.map((h) => {
              const o = PART_BY_ID[h.a === r.id ? h.b : h.a]
              return (
                <li key={h.id}>
                  <button type="button" className="rel-name" onClick={() => onPart(o.id)}>{real ? o.rs : o.nm}</button>
                  <span>{real ? h.r : h.w}</span>
                </li>
              )
            })}
          </ul>
        </>
      )}
      <div className="kick">나오는 {NAMES.card}</div>
      {cards.length
        ? <ul className="golist">{cards.map((cid) => <CardLink key={cid} id={cid} progress={progress} onGo={onGo} />)}</ul>
        : <p className="hint">아직 이 {NAMES.part(real)}을 다루는 {NAMES.card}가 없습니다.</p>}
    </section>
  )
}
