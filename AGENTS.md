# AGENTS.md

영일 출장자 현황 — Supabase 기반 정적 웹앱. 코드 개요는 `README.md` 참고.

## 작업 시작 전 반드시 읽을 것

프로젝트 지식 문서는 모두 `MDs/` 폴더에 있다.

- `MDs/PROJECT_CONTEXT.md` — 목적, 화면/파일 구조, 데이터 모델, 운영 규칙
- `MDs/TODO.md` — 완료/남은 작업
- `MDs/BUGS.md` — 버그 및 해결 이력 (같은 버그를 다시 만들지 않기 위해 필수)
- `MDs/DECISIONS.md` — 주요 결정과 그 이유 (뒤집기 전에 먼저 확인)
- `MDs/PROJECT_LESSONS.md` — 시행착오 회고, 재발 방지 기록
- `MDs/WORK_LOG.md` — 작업 이력
- `MDs/plan.md` — 화면/기능 구현 기준 요약
- `MDs/Supabase_setup.md` — Supabase 프로젝트 설정 절차
- `ShortCut/README.md` — 배포 후 바로가기 파일 안내

## 작업 후 기록 규칙

- 작업 내역 → `MDs/WORK_LOG.md` (append-only, 과거 항목 수정 금지)
- 구조/스택/정책을 바꾼 결정 → `MDs/DECISIONS.md` (append-only)
- 버그를 만들었거나 고쳤으면 → `MDs/BUGS.md`
- 할 일 변화 → `MDs/TODO.md`
- 문서에 이미지를 넣을 때는 `MDs/attachments/`에 두고 상대경로로 참조한다.
  (`MDs/`는 Obsidian Vault에 연결되어 있어 폴더 바깥 이미지는 표시되지 않는다.)

## 주의

- `.env`와 service_role key는 절대 커밋하지 않는다. `src/config.js`의 URL/anon key만 공개 설정이다.
- 이 저장소는 GitHub Pages로 루트가 공개된다. `MDs/` 안의 문서도 URL로 열람 가능하므로 비공개 정보를 적지 않는다.
- Supabase 스키마 변경은 `supabase/migrations/`에 새 번호 파일로 추가한다. 기존 마이그레이션은 수정하지 않는다.
- `MDs/`는 Obsidian Vault(`HermesVault/03_Projects/260507_Youngil_BusinessTrip`)와 Junction으로 연결되어 있다. 원본은 이 저장소이며, 폴더 이름을 바꾸면 연결이 끊긴다.
