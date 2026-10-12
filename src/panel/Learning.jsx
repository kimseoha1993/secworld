import { useMemo } from 'react'
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

function Evidence({ notes }) {
  if (!notes || !notes.length) return null
  return (
    <section className="evidence">
      <h3>근거</h3>
      <ol>
        {notes.map((n, i) => (
          <li key={i}>
            <p>{n.t}</p>
            <a href={SOURCES[n.s].u} target="_blank" rel="noopener noreferrer">{SOURCES[n.s].t}</a>
          </li>
        ))}
      </ol>
    </section>
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

  return (
    <div className="learning">
      <div className="qhead">
        <div className="unit-title">{unitTitle(unit)}</div>
        <button type="button" className="qclose" onClick={onClose}>관계도로</button>
      </div>
      <Track unit={unit} up={up} onStage={(i) => go({ stage: i, step: 0 })} />

      {at.kind !== 'scene' && (
        <div className="scene-mini">
          <span>누가 <b>{stage.scene.who}</b></span>
          <span>어디서 <b>{stage.scene.where}</b></span>
          <span>무엇을 <b>{stage.scene.what}</b></span>
        </div>
      )}

      <div className="steps" aria-label="진행">
        {Array.from({ length: total + 1 }, (_, i) => (
          <button type="button" key={i} className={'dot' + (i < up.step ? ' seen' : '')}
            aria-current={i === up.step ? 'step' : undefined}
            aria-label={i === 0 ? '장면' : i <= stage.cards.length ? stage.cards[i - 1].label : '확인 테스트'}
            onClick={() => go({ step: i })} />
        ))}
      </div>

      {at.kind === 'test'
        ? <section className="card"><Test key={unit.id + stage.id} stage={stage} onPass={pass} /></section>
        : <StepCard key={unit.id + stage.id + '-' + up.step} stage={stage} at={at} />}

      <div className="nav">
        <button type="button" className="btn ghost" disabled={up.step === 0} onClick={() => go({ step: up.step - 1 })}>이전</button>
        {at.kind !== 'test' && (
          <button type="button" className="btn" onClick={() => go({ step: up.step + 1 })}>
            {up.step === total - 1 ? '확인 테스트로' : '다음'}
          </button>
        )}
        {at.kind === 'test' && passed && !last && (
          <button type="button" className="btn" onClick={() => go({ stage: up.stage + 1, step: 0 })}>
            {unit.stages[up.stage + 1].label}로
          </button>
        )}
        {at.kind === 'test' && passed && last && <span className="end">{unitTitle(unit)}을(를) 모두 통과했습니다.</span>}
      </div>

      {at.kind === 'card' && <Evidence notes={at.card.notes} />}
    </div>
  )
}
