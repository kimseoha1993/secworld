// 학습 진행 기록. 이 브라우저에만 남는다(localStorage). 막혀 있어도 화면은 동작한다
// 모양: { unit: 마지막으로 본 단위 id, units: { [단위 id]: { stage, step, done: { [단계 id]: true } } } }
const KEY = 'secworld-progress-v2'
const OLD_KEY = 'secworld-s01-v1'

function read(key) {
  try {
    const raw = localStorage.getItem(key)
    const v = raw ? JSON.parse(raw) : null
    return v && typeof v === 'object' ? v : null
  } catch {
    return null
  }
}

// units: 콘텐츠의 단위 목록. 없어진 단위·범위를 벗어난 위치·잠긴 단계는 바로잡는다
export function loadProgress(units) {
  let p = read(KEY)
  if (!p) {
    const old = read(OLD_KEY)
    p = { unit: units[0].id, units: old ? { S01: old } : {} }
  }
  const out = { unit: units.some((u) => u.id === p.unit) ? p.unit : units[0].id, units: {} }
  for (const u of units) {
    const s = (p.units && p.units[u.id]) || {}
    const done = s.done && typeof s.done === 'object' ? s.done : {}
    let stage = Math.min(Math.max(0, s.stage | 0), u.stages.length - 1)
    let step = Math.max(0, s.step | 0)
    if (stage > 0 && !done[u.stages[stage - 1].id]) { stage = 0; step = 0 }
    step = Math.min(step, u.stages[stage].cards.length + 1)
    out.units[u.id] = { stage, step, done }
  }
  return out
}

export function saveProgress(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* 저장 불가 환경 */ }
}
