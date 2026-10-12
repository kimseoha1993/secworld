// 본문 표기 해석: **굵게**, [[이 나라 이름|실제 이름]]. 화면 그리기와 검색 색인이 같이 쓴다
const TOKEN = /\*\*(.+?)\*\*|\[\[(.+?)\|(.+?)\]\]/g

export function tokens(text) {
  const out = []
  let last = 0
  for (const m of text.matchAll(TOKEN)) {
    if (m.index > last) out.push({ t: text.slice(last, m.index) })
    if (m[1] !== undefined) out.push({ b: m[1] })
    else out.push({ w: m[2], r: m[3] })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ t: text.slice(last) })
  return out
}

// 블록 안의 글(본문·소제목·안내·선택지)을 순서대로 꺼낸다
export function blockTexts(blocks) {
  const out = []
  for (const bl of blocks) {
    if (typeof bl.p === 'string') out.push(bl.p)
    if (typeof bl.h3 === 'string') out.push(bl.h3)
    if (bl.callout) out.push(bl.callout.text)
    if (bl.opts) out.push(...bl.opts)
  }
  return out
}
