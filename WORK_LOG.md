# 작업 로그

날짜별로 수행한 작업을 짧게 기록합니다. (커밋과 별개로 “무슨 일을 했는지” 추적할 때 유용합니다.)

## 형식 예시

### YYYY-MM-DD

- 한 일 1
- 한 일 2

---

### 2026-05-07

- 구현 계획을 `docs/출장관리_구현안.md` 로 이전(저장소 정본화).
- Supabase 무료 플랜 + GitHub Pages 정적 SPA 구조로 결정(ADR-002~004).
- 정적 웹앱 뼈대 작성: `index.html`, `src/main.js`, `src/auth.js`, `src/store.js`, `src/trips.js`, `src/stats.js`, `src/admin.js`, `src/permissions.js`, `src/supabase.js`, `src/config.js`, `src/styles.css`.
- Supabase 스키마/RLS 마이그레이션 초안: `supabase/migrations/001_initial_schema.sql`.
- GitHub Pages 배포 보조 파일 추가: `.nojekyll`, `ShortCut/영일출장자현황.url.template`, `ShortCut/README.md`.
- README에 로컬 실행/배포 가이드 추가, TODO/DECISIONS 갱신.
- PROJECT_CONTEXT 운영 규칙(`master` 브랜치) 반영, README 푸시 명령 갱신.
- Supabase 프로젝트 생성·연결 가이드(`docs/Supabase_setup.md`) 작성.

---

### 2026-05-09

- MD 문서·TODO 기준 «다음 단계» 점검: Supabase 마이그레이션·연동은 사용자 콘솔 작업이 필요함을 확인.
- RLS로 일반 직원이 `employees` 직접 UPDATE 불가 → `mark_own_password_changed()` RPC 및 마이그레이션 `002` 추가, `store.js`에서 RPC 호출로 변경.
- `docs/Supabase_setup.md`, `README.md`, `TODO.md`에 `002` 적용 안내 반영.

---

### 템플릿

### YYYY-MM-DD

- 

---

### 2026-05-10

- `admin-manage.html` 관리 화면 조정: 부서관리/업체등록 영역 폭을 넓히고, 타이틀 아래 데이터 글자 크기를 축소했다.
- 부서관리 목록에서 `[v] 사용` 문구를 제거해 부서명만 표시되도록 정리했다.
- 직원/관리자 출장 화면의 출장 필터를 `출장중`, `출장예정`, `출장전체`, `국내출장`, `해외출장`으로 확장했다.
- `출장중`은 오늘 포함 일정, `출장예정`은 미래 시작 일정, `출장전체`은 현재/미래 일정을 표시하도록 필터 기준을 분리했다.
- 출장 통계(`[출장중]`, `[출장예정]`, `[국내출장]`, `[해외출장]`)를 추가하고, 작은 박스형 UI로 테이블 위에 배치했다.
- 통계는 동일 직원이 여러 출장 행을 갖더라도 항목별 1명으로 계산하도록 구현했다.
- 국가 선택 드롭다운을 `국내` 최상단 고정, 구분선, 나머지 국가 가나다순 표시로 변경했다.
- 직원/관리자 출장등록 폼에서 `도시명(선택)` 항목을 제거하고, 폼 타이틀/행간을 조정했다.
- 출장자 현황 테이블 페이지당 표시 행 수를 15행으로 변경했다.
- `ref/businesstrip_up.xlsx` 양식 기준 출장 엑셀 업로드 기능을 추가했다.
- 출장 엑셀 업로드 시 필수 값 누락, 날짜 오류, 종료일 역전, 동일 직원 일정 겹침은 해당 행만 skip 처리하고 나머지 등록은 계속 진행하도록 구현했다.
- skip/실패 사유는 토스트 팝업으로 표시하며, 토스트 표시 시간을 10초로 변경했다.
- 출장자 현황 테이블 위 우측에 `출장 엑셀업로드`, `엑셀 다운로드` 버튼을 배치했다.
- 현재 필터/부서 조건 기준으로 출장 목록을 `business_trips.xlsx`로 다운로드하는 기능을 추가했다.
- 주요 JS 변경 후 `node --check src/app.js`로 문법 검증을 수행했다.
