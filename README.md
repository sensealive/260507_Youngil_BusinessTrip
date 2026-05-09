# 영일 출장자 현황

직원 출장 등록, 현재 출장자 확인, 출장 통계를 관리하는 정적 웹앱입니다.

## 개요

GitHub Pages에 배포 가능한 정적 프론트엔드와 Supabase 무료 플랜(PostgreSQL/Auth)을 사용합니다.

- 직원: 부서와 이름을 선택해 로그인하고 본인 출장 등록/수정/취소, 통계 확인
- 부서장: 부서원 출장 현황과 통계 확인
- 관리자: 부서/직원/전체 출장 데이터 관리

## 시작하기

자세한 단계는 [`docs/Supabase_setup.md`](./docs/Supabase_setup.md) 를 참고하세요. 요약은 다음과 같습니다.

1. Supabase 프로젝트를 만들고 `supabase/migrations/001_initial_schema.sql`, `002_mark_own_password_changed_rpc.sql`, `003_employee_login_id.sql`을 순서대로 SQL Editor에서 실행합니다.
2. 기본 관리자 Auth 사용자를 만들고 `supabase/seed/default_admin.sql`로 직원 정보와 연결합니다.
3. 직원은 관리자 화면에서 부서, ID, 이름, 초기 비밀번호만 입력해 등록합니다. 앱이 내부 Auth 이메일과 UID 연결을 자동 처리합니다.
4. 아래 «로컬에서 실행» 또는 GitHub Pages 배포로 사이트를 엽니다. 기본 화면은 직원 로그인이며, URL·anon key는 **우측 상단 «관리자 로그인»**에서 저장하거나, `src/config.js`의 `DEFAULT_SUPABASE_URL`, `DEFAULT_SUPABASE_ANON_KEY`에 공개 가능한 값을 넣어 두면 직원이 별도로 입력하지 않습니다. `service_role` 키는 절대 브라우저 코드에 넣지 않습니다.

### 로컬에서 실행

이 앱은 ES 모듈을 사용하므로 `file://` 로 직접 열면 동작하지 않습니다. 아래 중 하나로 정적 서버를 띄웁니다.

```powershell
# Python 3 이 있는 경우
python -m http.server 5500

# Node.js 가 있는 경우
npx --yes serve . -l 5500
```

브라우저에서 `http://localhost:5500/` 로 접속합니다.

### GitHub Pages 배포

PROJECT_CONTEXT 운영 규칙에 따라 **`master` 브랜치**로 푸시합니다.

```powershell
git init
git add .
git commit -m "초기 커밋: 출장 관리 정적 웹앱"
git branch -M master
git remote add origin https://github.com/sensealive/260507_Youngil_BusinessTrip.git
git push -u origin master
```

1. 위 명령으로 저장소에 `master` 브랜치를 푸시합니다.
2. **Settings → Pages** 에서 Source 를 `Deploy from a branch`, Branch 를 `master / (root)` 로 지정합니다.
3. 약 1분 뒤 `https://sensealive.github.io/260507_Youngil_BusinessTrip/` 에서 접속이 되는지 확인합니다.
4. `ShortCut/영일출장자현황.url.template` 을 복사해 `영일출장자현황.url` 로 만들고, `URL=` 를 실제 주소로 바꿉니다. ASCII(퍼센트 인코딩) URL만 저장합니다.
5. 다른 PC에서 바로가기를 더블 클릭해 정상 접속되는지 확인합니다.

루트의 `.nojekyll` 파일은 GitHub Pages가 `_`로 시작하는 파일을 무시하지 않게 합니다.

## 문서

| 파일 | 용도 |
|------|------|
| [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) | 배경, 목표, 범위 |
| [docs/출장관리_구현안.md](./docs/출장관리_구현안.md) | 구현 계획 |
| [docs/Supabase_setup.md](./docs/Supabase_setup.md) | Supabase 프로젝트 생성/연결 절차 |
| [WORK_LOG.md](./WORK_LOG.md) | 작업 기록 |
| [TODO.md](./TODO.md) | 할 일 |
| [BUGS.md](./BUGS.md) | 알려진 이슈 |
| [DECISIONS.md](./DECISIONS.md) | 아키텍처·기술 결정 |

## 라이선스

(선택) 라이선스를 명시합니다.
