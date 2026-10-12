import { useEffect, useRef, useState } from 'react'
import { UNITS, stageOpen, unitTitle } from '../content.js'

// 목차 서랍: 주제(번호) › 단계 › 카드. 왼쪽에서 패널 위로 덮여 나온다
export default function Toc({ open, onClose, progress, current, onGo }) {
  const [expanded, setExpanded] = useState({})
  const closeRef = useRef(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const toggle = (k) => setExpanded((x) => ({ ...x, [k]: !x[k] }))

  return (
    <>
      <div className={'toc-backdrop' + (open ? ' on' : '')} onClick={onClose} aria-hidden="true" />
      <nav className={'toc' + (open ? ' on' : '')} aria-label="목차" inert={open ? undefined : true}>
        <div className="toc-head">
          <h2>목차</h2>
          <button ref={closeRef} type="button" className="qclose" onClick={onClose}>닫기</button>
        </div>
        <ol className="toc-units">
          {UNITS.map((u, ui) => {
            const up = progress.units[u.id]
            return (
              <li key={u.id}>
                <div className="toc-unit">{unitTitle(u)}</div>
                <ol className="toc-stages">
                  {u.stages.map((s, si) => {
                    const st = up.done[s.id] ? 'done' : stageOpen(u, up, si) ? 'open' : 'locked'
                    const key = u.id + s.id
                    const isCur = current && current.ui === ui && current.si === si
                    return (
                      <li key={s.id}>
                        <div className="toc-stage" data-state={st}>
                          <button type="button" className="toc-go" aria-current={isCur ? 'step' : undefined}
                            onClick={() => onGo({ ui, si, step: 0 })}>
                            <b>{s.label}</b>
                            <small>{st === 'done' ? '통과' : st === 'locked' ? '잠김' : '열림'}</small>
                          </button>
                          <button type="button" className="toc-fold" aria-expanded={!!expanded[key]}
                            aria-label={`${s.label} 카드 ${expanded[key] ? '접기' : '펼치기'}`} onClick={() => toggle(key)}>
                            <span aria-hidden="true">{expanded[key] ? '−' : '+'}</span>
                          </button>
                        </div>
                        {expanded[key] && (
                          <ol className="toc-cards">
                            {s.cards.map((c, i) => (
                              <li key={c.id}>
                                <button type="button" className={st === 'locked' ? 'locked' : ''}
                                  aria-current={isCur && current.step === i + 1 ? 'step' : undefined}
                                  onClick={() => onGo({ ui, si, step: i + 1 })}>
                                  {c.label}
                                </button>
                              </li>
                            ))}
                          </ol>
                        )}
                      </li>
                    )
                  })}
                </ol>
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
