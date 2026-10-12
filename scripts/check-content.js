// 콘텐츠 검사: 단위가 참조하는 구성요소·연결·주제·출처 ID가 실제로 있는지, 카드 ID가 규칙에 맞는지 확인한다
// 실행: node scripts/check-content.js
import { PARTS, LINKS } from '../content/world.js'
import { SOURCES } from '../content/sources.js'
import { TOPICS } from '../content/topics.js'
import { UNITS } from '../content/index.js'

const errors = []
const err = (where, msg) => errors.push(`${where}: ${msg}`)

const partIds = new Set()
for (const r of PARTS) {
  if (!/^[a-z]+$/.test(r.id)) err(`part ${r.id}`, '구성요소 ID는 영어 소문자 한 단어')
  if (partIds.has(r.id)) err(`part ${r.id}`, '중복')
  partIds.add(r.id)
}
const linkIds = new Set()
for (const h of LINKS) {
  if (h.id !== `${h.a}-${h.b}`) err(`link ${h.id}`, `id 가 a-b(${h.a}-${h.b})와 다름`)
  if (!partIds.has(h.a) || !partIds.has(h.b)) err(`link ${h.id}`, '없는 구성요소를 잇는다')
  if (linkIds.has(h.id)) err(`link ${h.id}`, '중복')
  linkIds.add(h.id)
}
const topicIds = new Set(TOPICS.map((t) => t.id))

function checkFocus(where, f) {
  if (!f) return
  for (const id of f.parts || []) if (!partIds.has(id)) err(where, `없는 구성요소 ${id}`)
  for (const id of f.links || []) {
    if (!linkIds.has(id)) {
      const rev = id.split('-').reverse().join('-')
      err(where, linkIds.has(rev) ? `연결 ${id} 는 역순. ${rev} 로 쓴다` : `없는 연결 ${id}`)
    }
  }
  if (f.pin && !partIds.has(f.pin)) err(where, `없는 구성요소 pin ${f.pin}`)
}

const nos = new Set()
for (const u of UNITS) {
  if (!topicIds.has(u.topic)) err(u.id, `없는 대표 주제 ${u.topic}`)
  if (nos.has(u.no)) err(u.id, `번호 ${u.no} 중복`)
  nos.add(u.no)
  for (const id of u.parts || []) if (!partIds.has(id)) err(u.id, `없는 구성요소 ${id}`)
  const seen = new Set()
  for (const st of u.stages) {
    const sw = `${u.id}/${st.id}`
    checkFocus(sw, st.focus)
    if (!st.focus || !st.focus.pin) err(sw, '단계 기본 focus.pin 이 없다')
    if (!st.test) err(sw, '테스트가 없다')
    st.cards.forEach((c, i) => {
      const want = `${u.id}-${st.id}-${i + 1}`
      if (c.id !== want) err(c.id || sw, `카드 ID는 순서대로 ${want}`)
      if (seen.has(c.id)) err(c.id, '중복')
      seen.add(c.id)
      checkFocus(c.id, c.focus)
      for (const t of c.topics || []) if (!topicIds.has(t)) err(c.id, `없는 주제 ${t}`)
      for (const n of c.notes || []) if (!SOURCES[n.s]) err(c.id, `없는 출처 ${n.s}`)
      if (!Array.isArray(c.blocks) || !c.blocks.length) err(c.id, 'blocks 가 비었다')
    })
  }
}

if (errors.length) {
  console.error(errors.join('\n'))
  console.error(`\n오류 ${errors.length}건`)
  process.exit(1)
}
console.log(`통과 — 구성요소 ${partIds.size}, 연결 ${linkIds.size}, 주제 ${topicIds.size}, 단위 ${UNITS.length}`)
