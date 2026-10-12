# 보안 세계 지도 (secworld)

보안이라는 시스템이 어떻게 돌아가는지를 한 나라의 지도로 익히는 학습 사이트.
세계의 구성(구성요소·연결·규칙·용어)은 [docs/SECWORLD_01_WORLD.md](docs/SECWORLD_01_WORLD.md), 커밋 메시지 형식은 [docs/SECWORLD_02_COMMIT.md](docs/SECWORLD_02_COMMIT.md)를 따른다.

## 구성

| 위치 | 내용 |
|---|---|
| `docs/` | 설계 문서 (색인, 세계 규칙, 조각별 문서) |
| `content/` | 화면이 읽는 데이터 (구성요소·연결, 주제, 학습 단위, 근거 출처) |
| `src/map/` | 지도 |
| `src/panel/` | 학습 패널 |
| `scripts/` | 콘텐츠 검사 |
| `prototypes/` | 초기 HTML 시제품 (참고용, 수정하지 않음) |

## 실행

```bash
npm install
npm run dev
```
