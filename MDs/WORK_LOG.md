# 작업 로그

## 2026-05-07

- 정적 웹앱 초기 구조 작성
- Supabase 스키마/RLS 초안 작성: `supabase/migrations/001_initial_schema.sql`
- GitHub Pages 보조 파일 추가: `.nojekyll`, `ShortCut/README.md`
- Supabase 설정 가이드 작성

## 2026-05-09

- 직원 본인 비밀번호 변경 후 `must_change_password` 해제용 RPC 추가
- `supabase/migrations/002_mark_own_password_changed_rpc.sql` 작성
- 직원 ID 로그인용 컬럼/정책 정리

## 2026-05-10

- `admin-manage.html`의 부서관리, 업체등록(출장지) 영역 폭과 글자 크기 조정
- 부서관리 목록의 `[v] 사용` 문구 제거
- 출장 필터를 `출장중`, `출장예정`, `출장전체`, `국내출장`, `해외출장`으로 정리
- `출장중`은 오늘이 출장기간에 포함되는 일정만 표시하도록 구현
- `출장예정`은 미래 시작 출장만 표시하도록 구현
- `출장전체`은 현재 진행 중인 출장과 미래 예정 출장을 표시하도록 구현
- 출장 통계 박스 추가: 출장중, 출장예정, 국내출장, 해외출장
- 통계는 동일 직원을 항목별 1명으로 계산하도록 정리
- 국가 선택 드롭다운 정리: 국내 최상단, 기타 최하단, 타 국가는 가나다순
- 기본 국가 목록 확장 마이그레이션 추가: `006_expand_default_countries.sql`
- 직원/관리자 출장 등록 폼에서 도시명 항목 제거
- 출장등록 폼 타이틀/행간 조정
- 출장자 현황 테이블 페이지당 표시 행 수를 15행으로 변경
- 출장자 현황 상단에 `출장 엑셀업로드`, `엑셀 다운로드` 버튼 추가
- `ref/businesstrip_up.xlsx` 양식 기반 출장 엑셀업로드 구현
- 필수값 누락, 날짜 오류, 기존/업로드 중 출장기간 겹침은 해당 행 skip 처리
- skip/오류 메시지는 10초 토스트로 표시
- 현재 필터 조건 기준 출장 엑셀 다운로드 구현
- 직원 화면도 관리자 화면과 같은 기준으로 전체 출장자 현황을 보도록 RLS/조회 로직 정리
- 관련 RLS 마이그레이션 추가: `007`, `008`, `009`
- 구형 미사용 JS 파일 삭제: `src/main.js`, `src/admin.js`, `src/trips.js`, `src/stats.js`, `src/permissions.js`
- Supabase URL/key를 저장소에 직접 넣지 않고 `src/config.local.js`에서 읽도록 정리

## 2026-05-11

- 직원 출장등록 폼 폭을 5px 넓히고 버튼 줄바꿈을 방지
- 출장 저장 버튼을 `수정&저장`, `신규저장`으로 분리
- `수정&저장`은 선택된 출장 행만 수정하도록 변경
- `신규저장`은 선택된 행이 있어도 새 일정으로 등록하도록 변경
- 일반 직원은 본인 출장만 수정/삭제 가능하도록 권한 검사 순서 보강
- 수정 저장 시 자기 자신 출장 행은 겹침 검사에서 제외하도록 보강
- 겹침 오류 메시지에 충돌 출장 기간/국가/업체명 표시
- 직원 화면에 `본인 출장만 보기` 버튼 추가
- `본인 출장만 보기` 버튼 색상을 녹색 계열로 조정
- 방문업체명을 텍스트 입력 방식으로 통일
- `업체명 참조` 드롭다운을 추가하고 선택 시 방문업체명 입력칸으로 복사하도록 구현
- `비고 (선택)` 라벨 줄바꿈 제거
- 현재접속자 아래 `[비밀번호 변경]` 버튼 추가
- 비밀번호 변경 팝업 구현: 현재 비밀번호, 새로운 비밀번호, 확인/취소
- 현재 비밀번호 검증 후 새 비밀번호 저장 구현
- 새 비밀번호 최소 6자리 검증 및 안내 문구 추가
- `node --check src/app.js`로 주요 JS 문법 검증 수행
- Supabase Project URL과 anon/public key를 숨김 로컬 파일 대신 `src/config.js` 공개 설정에서 읽도록 정리
- `src/config.local.example.js` 삭제 및 관련 문서/배포 안내 갱신

## 2026-09-21

- 프로젝트 md 문서를 `MDs/` 폴더로 모았다(`PROJECT_CONTEXT`, `plan`, `TODO`, `WORK_LOG`, `BUGS`, `PROJECT_LESSONS`, `docs/Supabase_setup`). `git mv`로 옮겨 파일 이력을 유지했다.
- `MDs/DECISIONS.md`를 신설하고 기존 커밋/회고에서 확인되는 결정 3건을 기록했다.
- `AGENTS.md`를 참조 파일 목록에서 작업 규칙 문서로 재작성하고, 같은 내용을 가리키는 `CLAUDE.md`를 추가했다. `README.md`의 문서 링크를 `MDs/` 기준으로 갱신했다.
- 템플릿 예시 그대로였던 `.cursor/rules/project-rules.mdc`를 실제 스택/규칙(빌드 도구 없음, config.js 단일화, 마이그레이션 추가 규칙, RLS 우선)으로 채웠다.
- 다른 프로젝트 회고였던 `PROJECT_LESSONS.Sample.md`를 저장소에서 제거하고 HermesVault `06_Templates/Project_Lessons_Template.md`로 옮겼다.
- `MDs/`를 Obsidian Vault `HermesVault/03_Projects/260507_Youngil_BusinessTrip`에 디렉터리 Junction으로 연결했다. 원본은 이 저장소이며 Vault는 같은 파일을 바라본다.

