# 영일 출장자 현황

직원 출장 등록, 출장자 현황 조회, 관리자 데이터 관리를 위한 정적 웹앱입니다.

## 주요 기능

- 공통 로그인: 관리자/직원 ID + 비밀번호
- 직원 출장 등록, 수정, 삭제
- 관리자 전체 직원 출장 등록, 수정, 삭제
- 출장자 현황 조회: 출장중, 출장예정, 출장전체, 국내출장, 해외출장
- 직원 화면 `본인 출장만 보기`
- 출장 통계 표시
- 출장 엑셀업로드 및 다운로드
- 부서, 직원, 업체등록(출장지) 관리
- 현재접속자 아래 비밀번호 변경 팝업

## 파일 구조

```text
index.html
business-trip.html
admin-business-trip.html
admin-manage.html
src/
  app.js
  auth.js
  config.js
  store.js
  styles.css
  supabase.js
supabase/
  migrations/
  seed/
MDs/
  PROJECT_CONTEXT.md, plan.md, TODO.md, WORK_LOG.md,
  BUGS.md, DECISIONS.md, PROJECT_LESSONS.md, Supabase_setup.md
```

Supabase Project URL과 anon/public key는 `src/config.js`에 입력합니다. 두 값은 브라우저 정적 앱에서 공개되는 클라이언트 설정이며, 보안은 Supabase RLS 정책으로 보호합니다.

## Supabase 설정

1. Supabase 프로젝트를 생성합니다.
2. `supabase/migrations/001_initial_schema.sql`부터 `009_restore_employee_login_lookup_policy.sql`까지 순서대로 SQL Editor에서 실행합니다.
3. 관리자 Auth 계정을 생성합니다.
4. `supabase/seed/default_admin.sql`로 관리자 직원 행을 연결합니다.
5. `src/config.js`에 실제 Project URL과 publishable/anon key를 입력합니다.

```js
export const DEFAULT_SUPABASE_URL = "https://your-project.supabase.co";
export const DEFAULT_SUPABASE_ANON_KEY = "your-publishable-or-anon-key";
```

`service_role` 키는 절대 브라우저 코드나 저장소에 넣지 않습니다.

자세한 절차는 [MDs/Supabase_setup.md](./MDs/Supabase_setup.md)를 확인합니다.

## 로컬 실행

ES module을 사용하므로 `file://`로 직접 열지 말고 정적 서버를 실행합니다.

```powershell
python -m http.server 5500
```

브라우저에서 `http://localhost:5500/`로 접속합니다.

## 배포

GitHub Pages 배포 시 `master / root` 기준으로 배포합니다.

```powershell
git branch -M master
git push -u origin master
```

GitHub Pages 배포 시에도 `src/config.js`에 입력된 Supabase URL/key가 사용됩니다.

## 문서

프로젝트 문서는 모두 `MDs/` 폴더에 있습니다.

- [MDs/PROJECT_CONTEXT.md](./MDs/PROJECT_CONTEXT.md): 현재 코드 기준 프로젝트 컨텍스트
- [MDs/plan.md](./MDs/plan.md): 화면/기능 구현 기준 요약
- [MDs/TODO.md](./MDs/TODO.md): 완료/남은 작업
- [MDs/WORK_LOG.md](./MDs/WORK_LOG.md): 작업 로그
- [MDs/BUGS.md](./MDs/BUGS.md): 버그 및 해결 이력
- [MDs/DECISIONS.md](./MDs/DECISIONS.md): 주요 결정 기록
- [MDs/PROJECT_LESSONS.md](./MDs/PROJECT_LESSONS.md): 작업 회고 및 재발 방지 기록
- [MDs/Supabase_setup.md](./MDs/Supabase_setup.md): Supabase 설정 가이드
- [ShortCut/README.md](./ShortCut/README.md): 바로가기 파일 안내
