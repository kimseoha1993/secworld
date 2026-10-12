import { Fragment, useState } from 'react'
import { blockTexts, tokens } from '../rich.js'

// 카드 하나에 나오는 이중 이름표를 순서대로 모은다 (번호와 아래 주석에 쓴다)
export function collectTerms(blocks) {
  const list = []
  const seen = new Map()
  for (const text of blockTexts(blocks)) {
    for (const tk of tokens(text)) {
      if (tk.w === undefined) continue
      const key = tk.w + '|' + tk.r
      if (!seen.has(key)) { list.push({ w: tk.w, r: tk.r }); seen.set(key, list.length) }
    }
  }
  return { list, seen }
}

// 본문 표기를 React 요소로 그린다. 문자열은 모두 텍스트로만 들어간다
export function Rich({ text, terms }) {
  return tokens(text).map((tk, i) => {
    if (tk.b !== undefined) return <b key={i}>{tk.b}</b>
    if (tk.w !== undefined) {
      const n = terms ? terms.seen.get(tk.w + '|' + tk.r) : null
      return (
        <span key={i} className="term" tabIndex={0} data-real={tk.r} aria-label={`${tk.w}, 실제 이름 ${tk.r}`}>
          {tk.w}{n ? <sup>{n}</sup> : null}
        </span>
      )
    }
    return <Fragment key={i}>{tk.t}</Fragment>
  })
}

function Clues({ items }) {
  const [opened, setOpened] = useState({})
  return (
    <div className="opts">
      {items.map((c, i) => (
        <div className="clue" key={i}>
          <b>{c.t}</b>
          {opened[i]
            ? <p className="found">{c.f}</p>
            : <button type="button" onClick={() => setOpened((o) => ({ ...o, [i]: true }))}>열어 보기</button>}
        </div>
      ))}
    </div>
  )
}

function Block({ bl, terms }) {
  if (bl.p !== undefined) return <p><Rich text={bl.p} terms={terms} /></p>
  if (bl.h3 !== undefined) return <h3><Rich text={bl.h3} terms={terms} /></h3>
  if (bl.callout) {
    return (
      <div className="callout">
        {bl.callout.title && <><b>{bl.callout.title}</b> · </>}
        <Rich text={bl.callout.text} terms={terms} />
      </div>
    )
  }
  if (bl.flow) {
    return (
      <div className="flow">
        {bl.flow.map((n, i) => n.arrow
          ? <div className="arrow" key={i}>{n.arrow}</div>
          : <div className="node" key={i}><span className="w">{n.w}</span>{n.note && <span className="note">{n.note}</span>}</div>)}
      </div>
    )
  }
  if (bl.nest) {
    return (
      <div className="nest-row">
        {bl.nest.map((g, i) => (
          <div className={'nest' + (g.ghost ? ' ghost' : '')} key={i}>
            <span className="lbl">{g.label}</span>
            <div className="inner">
              {g.items.map((n, j) => <div className="node" key={j}><span className="w">{n.w}</span>{n.note && <span className="note">{n.note}</span>}</div>)}
            </div>
          </div>
        ))}
      </div>
    )
  }
  if (bl.opts) return <div className="opts">{bl.opts.map((o, i) => <div className="opt" key={i}><div><Rich text={o} terms={terms} /></div></div>)}</div>
  if (bl.table) {
    return (
      <div className="tbl">
        <table>
          <thead><tr><th>이 나라에서</th><th>실제로는</th></tr></thead>
          <tbody>
            {bl.table.map((r, i) => (
              <tr key={i}><td>{r[0]}</td><td><code>{r[1]}</code><div className="tdesc">{r[2]}</div></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  if (bl.clues) return <Clues items={bl.clues} />
  return null
}

export default function Blocks({ blocks, terms }) {
  return (
    <div className="prose">
      {blocks.map((bl, i) => <Block key={i} bl={bl} terms={terms} />)}
    </div>
  )
}

export function TermCaption({ terms }) {
  if (!terms.list.length) return null
  return (
    <ol className="caption">
      {terms.list.map((x, i) => <li key={i}>{x.w} = {x.r}</li>)}
    </ol>
  )
}
