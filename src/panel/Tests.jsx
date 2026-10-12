import { useEffect, useMemo, useState } from 'react'

// 단계 확인 테스트. 통과하면 onPass 를 부른다
function Choice({ t, name, onPass }) {
  const [sel, setSel] = useState(null)
  const [reason, setReason] = useState('')
  const [fb, setFb] = useState(null)
  const diag = t.type === 'diag'

  const check = () => {
    if (sel === null) return setFb({ ok: false, text: '답을 하나 골라 주세요.' })
    if (diag && reason.trim().length < 10) return setFb({ ok: false, text: '이유를 한두 문장 적어 주세요. 고르기만 하면 설명 연습이 되지 않습니다.' })
    const right = sel === t.a
    setFb({ ok: right, text: right ? t.ok : t.no, model: right && diag ? t.model : null })
    if (right) onPass()
  }

  return (
    <>
      <div className="opts">
        {t.opts.map((o, i) => (
          <label className="opt" key={i}>
            <input type="radio" name={name} checked={sel === i} onChange={() => setSel(i)} />
            <span>{o}</span>
          </label>
        ))}
      </div>
      {diag && (
        <>
          <label htmlFor={name + '-reason'}>이유</label>
          <textarea id={name + '-reason'} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="왜 그렇게 판단했는지 적어 보세요" />
        </>
      )}
      <button type="button" className="btn start" onClick={check}>확인</button>
      {fb && <div className={'fb ' + (fb.ok ? 'ok' : 'no')}>{fb.text}</div>}
      {fb && fb.model && <div className="fb">모범 답: {fb.model}</div>}
    </>
  )
}

function Match({ t, name, onPass }) {
  const options = useMemo(() => t.rows.map((r) => r[1]).sort((a, b) => a.localeCompare(b, 'ko')), [t])
  const [vals, setVals] = useState(() => t.rows.map(() => ''))
  const [checked, setChecked] = useState(false)
  const allOk = vals.every((v, i) => v === t.rows[i][1])

  const check = () => { setChecked(true); if (allOk) onPass() }

  return (
    <>
      <div className="match">
        {t.rows.map((r, i) => (
          <div className="mrow" key={i}>
            <label htmlFor={`${name}-${i}`}><b>{r[0]}</b></label>
            <select id={`${name}-${i}`} value={vals[i]}
              className={checked ? (vals[i] === r[1] ? 'good' : 'bad') : ''}
              onChange={(e) => setVals((v) => v.map((x, j) => (j === i ? e.target.value : x)))}>
              <option value="">실제 이름 고르기</option>
              {options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>
      <button type="button" className="btn start" onClick={check}>확인</button>
      {checked && <div className={'fb ' + (allOk ? 'ok' : 'no')}>{allOk ? t.ok : t.no}</div>}
    </>
  )
}

// claude.ai 아티팩트 안에서 열었을 때만 Claude 채점을 쓸 수 있다. 그 밖에서는 모범 답 비교만 남는다
function useSample() {
  const [sample, setSample] = useState(null)
  useEffect(() => {
    const c = typeof window !== 'undefined' ? window.claude : null
    if (!c || typeof c.use !== 'function') return
    let live = true
    c.use('sample').then((s) => { if (live && s) setSample(() => s) }).catch(() => {})
    return () => { live = false }
  }, [])
  return sample
}

function Write({ t, name, onPass }) {
  const [ans, setAns] = useState('')
  const [fb, setFb] = useState(null)
  const [showModel, setShowModel] = useState(false)
  const [ai, setAi] = useState(null)
  const [busy, setBusy] = useState(false)
  const sample = useSample()

  const tooShort = () => ans.trim().length < t.min

  const compare = () => {
    if (tooShort()) return setFb('먼저 내 말로 설명을 적어 주세요. 모범 답을 먼저 보면 설명 테스트가 의미 없어집니다.')
    setFb(null); setShowModel(true); onPass()
  }

  const grade = () => {
    if (tooShort()) return setFb('먼저 내 말로 설명을 적어 주세요.')
    setFb(null); setBusy(true); setAi('읽는 중...')
    const prompt = '너는 보안 개념 학습의 채점자다. 학습자가 쓴 설명을 아래 기준과 대조해 한국어로 짧게 피드백해라.\n'
      + `형식: 첫 줄에 '충족 n/${t.rubric.length}'. 이어서 기준마다 한 줄씩 [충족] 또는 [빠짐]과 근거. 마지막에 고칠 점 한 문장. 칭찬이나 인사는 넣지 마라.\n\n`
      + '질문: ' + t.q + '\n\n기준:\n' + t.rubric.map((r, i) => `${i + 1}) ${r}`).join('\n') + '\n\n'
      + '학습자 답:\n' + ans.trim().slice(0, 4000)
    sample(prompt, { modelTier: 'quick', onText: (u) => setAi(u.text) })
      .then((r) => setAi(r.text))
      .catch((e) => {
        const c = e && e.code
        if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(c)) setAi('이 화면에서는 Claude 채점을 쓸 수 없습니다. 모범 답과 직접 비교해 주세요.')
        else if (c === 'rate_limited') setAi('요청이 많습니다. 잠시 뒤 다시 눌러 주세요.')
        else if (c === 'cancelled') setAi(null)
        else setAi('채점이 중간에 끊겼습니다. 다시 눌러 주세요.')
      })
      .finally(() => setBusy(false))
  }

  return (
    <>
      <label htmlFor={name + '-write'}>내 설명</label>
      <textarea id={name + '-write'} value={ans} onChange={(e) => setAns(e.target.value)} placeholder={t.placeholder} />
      <div className="row">
        <button type="button" className="btn" onClick={compare}>모범 답과 비교하기</button>
        {sample && <button type="button" className="btn ghost" onClick={grade} disabled={busy}>Claude에게 채점받기</button>}
      </div>
      {fb && <div className="fb no">{fb}</div>}
      {showModel && <div className="fb ok">모범 답: {t.model}</div>}
      {ai && <div className="fb ai">{ai}</div>}
    </>
  )
}

export default function Test({ stage, onPass }) {
  const t = stage.test
  const name = 'q-' + stage.id
  return (
    <div className="test">
      <div className="tag">{t.tag}</div>
      <p className="q">{t.q}</p>
      {(t.type === 'choice' || t.type === 'diag') && <Choice t={t} name={name} onPass={onPass} />}
      {t.type === 'match' && <Match t={t} name={name} onPass={onPass} />}
      {t.type === 'write' && <Write t={t} name={name} onPass={onPass} />}
    </div>
  )
}
