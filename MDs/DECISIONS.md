# 결정 기록 (append-only)

구조, 스택, 정책을 바꾼 결정을 이유와 함께 남긴다. 과거 항목은 수정하지 않고 새 항목만 추가한다.

형식: `## YYYY-MM-DD — 제목` / 배경 / 결정 / 이유 / 영향

---

## 2026-05-11 — Supabase 설정을 `src/config.js` 단일 경로로 통합
- 배경: Supabase URL/key가 여러 파일에 흩어져 로컬 오버레이와 충돌했다.
- 결정: 공개 클라이언트 설정(URL, anon key)을 `src/config.js` 한 곳에서만 읽는다.
- 이유: 정적 호스팅에서 어차피 공개되는 값이므로 숨기지 않고 한 곳으로 모으는 편이 혼란이 적다. 실제 보안은 RLS 정책이 담당한다.
- 영향: 로컬 오버레이 제거. service_role key는 저장소에 두지 않는다.
- 근거: 커밋 `1874099`, `MDs/PROJECT_LESSONS.md`

## 2026-05-27 — 배포는 GitHub Pages 정적 호스팅 유지
- 배경: 사내 사용자 대상 소규모 앱이고 서버 운영 인력이 없다.
- 결정: 백엔드 서버 없이 GitHub Pages + Supabase 조합을 유지한다.
- 이유: 운영 비용이 들지 않고 배포가 push 한 번으로 끝난다.
- 영향: 저장소 루트가 공개되므로 `MDs/` 문서에 비공개 정보를 적을 수 없다. 인증/권한은 전적으로 Supabase Auth와 RLS에 의존한다.

## 2026-09-21 — 프로젝트 md 문서를 `MDs/`로 모으고 Obsidian Vault와 Junction 연결
- 배경: 문서가 저장소 루트에 흩어져 있었고, Obsidian Vault(`HermesVault/03_Projects/`)에는 빈 폴더만 있어 프로젝트 지식이 두 곳으로 갈릴 상황이었다.
- 결정: 원본 문서는 이 저장소의 `MDs/`에 두고, Vault 쪽 폴더를 `MDs/`를 가리키는 디렉터리 Junction으로 만든다. 문서를 Vault로 복사하지 않는다.
- 이유: IDE에서 프로젝트 폴더만 열어도 에이전트가 컨텍스트를 읽을 수 있어야 하고(문서가 Vault에만 있으면 불가능), 동시에 Obsidian에서도 같은 파일을 보고 편집할 수 있어야 한다. 파일이 하나뿐이라 동기화 문제가 없다.
- 영향: `MDs/` 폴더 이름을 바꾸면 Junction이 끊긴다. md에 넣을 이미지는 `MDs/attachments/`에 두어야 Obsidian에서 보인다. 비md 문서는 `docs/`를 별도로 쓴다.
