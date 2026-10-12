// 콘텐츠를 화면에서 쓰기 좋게 묶는다: 단위 제목, 잠김 판정, 구성요소별 등장 카드, 검색 색인
import { LINKS, PARTS } from '../content/world.js'
import { TOPICS } from '../content/topics.js'
import { UNITS } from '../content/index.js'
import { blockTexts, tokens } from './rich.js'

export { UNITS, PARTS, LINKS }
export const PART_BY_ID = Object.fromEntries(PARTS.map((p) => [p.id, p]))
const TOPIC_BY_ID = Object.fromEntries(TOPICS.map((t) => [t.id, t]))

// 화면에 보이는 이름. 바꿀 때는 여기만 고친다
export const NAMES = {
  part: (real) => (real ? '시스템' : '기관'),
  link: (real) => (real ? '연동' : '연결'),
  topic: '주제',
  card: '카드',
}

export const unitTitle = (u) => `${u.no}. ${TOPIC_BY_ID[u.topic].name}`

// 단계 순서: step 0 = 장면, 1..n = 카드, n+1 = 확인 테스트
export function stepAt(stage, step) {
  if (step === 0) return { kind: 'scene' }
  if (step > stage.cards.length) return { kind: 'test' }
  return { kind: 'card', card: stage.cards[step - 1] }
}

// 앞 단계 테스트를 통과해야 다음 단계가 열린다
export const stageOpen = (unit, up, si) => si === 0 || !!(up && up.done[unit.stages[si - 1].id])

// 카드 위치: id → { ui, si, step }
export const CARD_AT = {}
UNITS.forEach((u, ui) => u.stages.forEach((st, si) => st.cards.forEach((c, i) => { CARD_AT[c.id] = { ui, si, step: i + 1, card: c } })))

// 구성요소별로 그 구성요소를 직접 강조하는 카드 (카드에 적힌 focus 만 센다)
export const CARDS_BY_PART = {}
for (const [id, at] of Object.entries(CARD_AT)) {
  for (const p of (at.card.focus && at.card.focus.parts) || []) (CARDS_BY_PART[p] ||= []).push(id)
}

// ===== 검색 =====
const norm = (s) => s.toLowerCase().replace(/\s+/g, '')

const ENTRIES = []
for (const p of PARTS) ENTRIES.push({ kind: 'part', id: p.id, keys: [p.nm, p.rs, p.r] })
UNITS.forEach((u, ui) => {
  const t = TOPIC_BY_ID[u.topic]
  ENTRIES.push({ kind: 'topic', ui, keys: [t.name, unitTitle(u)] })
  for (const st of u.stages) {
    for (const c of st.cards) {
      const keys = [c.title, c.label]
      for (const text of blockTexts(c.blocks)) for (const tk of tokens(text)) if (tk.w !== undefined) keys.push(tk.w, tk.r)
      for (const bl of c.blocks) if (bl.table) for (const row of bl.table) keys.push(row[0], row[1])
      for (const tid of c.topics || []) keys.push(TOPIC_BY_ID[tid].name)
      ENTRIES.push({ kind: 'card', id: c.id, keys })
    }
  }
})
for (const e of ENTRIES) e.nkeys = e.keys.map(norm)

// 결과: { part:[], topic:[], card:[] }. 각 항목의 hit 는 걸린 이름(제목과 다르면 함께 보여 준다)
export function search(q) {
  const nq = norm(q)
  const out = { part: [], topic: [], card: [] }
  if (!nq) return out
  for (const e of ENTRIES) {
    const i = e.nkeys.findIndex((k) => k.includes(nq))
    if (i < 0) continue
    out[e.kind].push({ ...e, hit: e.keys[i], rank: e.nkeys[i] === nq ? 0 : e.nkeys[i].startsWith(nq) ? 1 : 2 })
  }
  for (const k of Object.keys(out)) out[k].sort((a, b) => a.rank - b.rank)
  return out
}
