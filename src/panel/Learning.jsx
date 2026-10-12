import { useMemo, useState } from 'react'
import { SOURCES } from '../../content/sources.js'
import { stageOpen, stepAt, unitTitle } from '../content.js'
import Blocks, { collectTerms, TermCaption } from './Blocks.jsx'
import Test from './Tests.jsx'

function Track({ unit, up, onStage }) {
  return (
    <nav className="track" aria-label="단계">
      {unit.stages.map((s, i) => {
        const st = up.done[s.id] ? 'done' : stageOpen(unit, up, i) ? 'open' : 'locked'
        return (
          <button type="button" key={s.id} className="stamp" data-state={st} disabled={st === 'locked'}
            aria-current={i === up.stage ? 'step' : undefined} onClick={() => onStage(i)}>
            <b>{s.label}</b>
            <small>{st === 'done' ? '통과' : st === 'locked' ? '잠김' : s.role + ' 시점'}</small>
          </button>
        )
      })}
    </nav>
  )
}

// 근거는 접어 둔다. 본문을 읽는 데 방해되지 않게
function Evidence({ notes }) {
  if (!notes || !notes.length) return null
  return (
    <details className="evidence">
      <summary>근거 {notes.length}</summary>
      <ol>
        {notes.map((n, i) => (
          <li key={i}>
            <p>{n.t}</p>
            <a href={SOURCES[n.s].u} target="_blank" rel="noopener noreferrer">{SOURCES[n.s].t}</a>
          </li>
        ))}
      </ol>
    </details>
  )
}

function StepCard({ stage, at }) {
  const blocks = at.kind === 'card' ? at.card.blocks : null
  const terms = useMemo(() => (blocks ? collectTerms(blocks) : null), [blocks])

  if (at.kind === 'scene') {
    return (
      <section className="card scene-hero">
        <div className="kicker">{stage.label} · 장면</div>
        <h2>먼저 이 장면을 머릿속에 두세요</h2>
        <dl className="big">
          <dt>누가</dt><dd>{stage.scene.who}</dd>
          <dt>어디서</dt><dd>{stage.scene.where}</dd>
          <dt>무엇을</dt><dd>{stage.scene.what}</dd>
        </dl>
        <p className="goal">이번 단계에서 알게 될 것 · <b>{stage.goal}</b></p>
      </section>
    )
  }
  const c = at.card
  if (c.real) {
    return (
      <section className="card">
        <div className="kicker">{c.label}<span className="realtag">실제 대응</span></div>
        <h2>{c.title}</h2>
        <Blocks blocks={c.blocks} terms={terms} />
        <TermCaption terms={terms} />
      </section>
    )
  }
  return (
    <section className="card story">
      <div className="kicker">{c.label}</div>
      <div className="dialog">
        <span className="speaker">이야기</span>
        <h2>{c.title}</h2>
        <Blocks blocks={c.blocks} terms={terms} />
      </div>
      <TermCaption terms={terms} />
    </section>
  )
}

// up: 이 단위의 진행 { stage, step, done } · setUp: 그 진행을 고치는 함수
export default function Learning({ unit, up, setUp, onClose }) {
  const stage = unit.stages[up.stage]
  const total = stage.cards.length + 1
  const at = stepAt(stage, up.step)
  const last = up.stage === unit.stages.length - 1
  const passed = !!up.done[stage.id]

  const go = (patch) => setUp((p) => ({ ...p, ...patch }))
  const pass = () => setUp((p) => ({ ...p, done: { ...p.done, [stage.id]: true } }))

  const [menu, setMenu] = useState(false)
  const pos = up.step + 1
  const count = total + 1
  let next = null
  if (at.kind !== 'test') next = { label: up.step === total - 1 ? '확인 테스트로' : '다음', on: () => go({ step: up.step + 1 }) }
  else if (passed && !last) next = { label: unit.stages[up.stage + 1].label + '로', on: () => go({ stage: up.stage + 1, step: 0 }) }

  return (
    <div className="learning">
      {/* 머리는 한 줄. 누르면 단계 이동과 장면 정보가 펼쳐진다 */}
      <div className="lhead">
        <button type="button" className="lhead-btn" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
          <span><b>{unitTitle(unit)}</b> · {stage.label} · {pos}/{count}</span>
          <span aria-hidden="true">{menu ? '▴' : '▾'}</span>
        </button>
        <button type="button" className="lhead-x" onClick={onClose} aria-label="학습 닫고 관계도로">×</button>
      </div>
      {menu && (
        <div className="lmenu">
          <Track unit={unit} up={up} onStage={(i) => { go({ stage: i, step: 0 }); setMenu(false) }} />
          <dl className="kv">
            <div><dt>누가</dt><dd>{stage.scene.who}</dd></div>
            <div><dt>어디서</dt><dd>{stage.scene.where}</dd></div>
            <div><dt>무엇을</dt><dd>{stage.scene.what}</dd></div>
          </dl>
        </div>
      )}

      {at.kind === 'test'
        ? <section className="card"><Test key={unit.id + stage.id} stage={stage} onPass={pass} /></section>
        : <StepCard key={unit.id + stage.id + '-' + up.step} stage={stage} at={at} />}
      {at.kind === 'test' && passed && last && <p className="end">{unitTitle(unit)}을(를) 모두 통과했습니다.</p>}

      {at.kind === 'card' && <Evidence notes={at.card.notes} />}

      {/* 이동은 아래에 고정 */}
      <div className="lfoot">
        <button type="button" className="btn ghost" disabled={up.step === 0} onClick={() => go({ step: up.step - 1 })}>← 이전</button>
        <div className="lbar" aria-hidden="true"><span style={{ width: (pos / count * 100) + '%' }} /></div>
        <button type="button" className="btn" disabled={!next} onClick={next ? next.on : undefined}>{next ? next.label + ' →' : '다음 →'}</button>
      </div>
    </div>
  )
}
