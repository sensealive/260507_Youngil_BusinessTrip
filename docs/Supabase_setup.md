# Supabase 설정 가이드

이 문서는 출장 관리 웹앱을 Supabase 무료 플랜에 연결하는 절차를 정리한 것입니다. 처음 한 번만 따라 하면 되고, 이후에는 콘솔에서 사용자/데이터만 추가합니다.

## 0. 자주 쓰는 사이트

| 용도 | URL |
|------|-----|
| Supabase 메인/회원가입·로그인 | https://supabase.com/ |
| 프로젝트 대시보드 | https://supabase.com/dashboard |
| 공식 문서(JS 클라이언트) | https://supabase.com/docs/reference/javascript |
| 무료 플랜 한도 안내 | https://supabase.com/pricing |
| 상태 페이지 | https://status.supabase.com/ |

## 1. 계정과 조직(Organization)

1. https://supabase.com/ 에서 **Start your project** → GitHub 또는 이메일로 로그인합니다.
2. 처음 로그인하면 조직(Organization)을 만들라고 합니다. 이름은 회사명/팀명으로 짧게 짓습니다(예: `youngil`).
3. 결제 플랜은 **Free** 를 선택합니다. 카드 등록 없이 사용 가능합니다.

## 2. 프로젝트 생성

1. 대시보드의 **New project** 버튼을 누릅니다.
2. 입력 항목
   - **Name**: 알아보기 쉬운 이름. 예: `youngil-business-trip`
   - **Database Password**: 자동 생성 후 안전한 곳에 저장. 이 값은 직원 로그인용이 아니라 PostgreSQL 관리용입니다.
   - **Region**: 한국에서 빠른 곳으로 `Northeast Asia (Seoul)` 또는 `Northeast Asia (Tokyo)` 권장.
   - **Pricing plan**: `Free`
   - **Enable automatic RLS**: **체크 권장**. `public` 스키마에 만드는 새 테이블의 RLS를 자동으로 켜 두는 안전장치입니다. 우리 마이그레이션은 이미 모든 테이블에 RLS를 명시적으로 켜기 때문에 충돌 없이 작동합니다. 새 테이블을 만들 때는 RLS 정책도 함께 추가해야 한다는 점만 기억합니다.
3. 약 2~3분이면 프로비저닝이 끝납니다.

## 3. 키와 URL 확인

좌측 메뉴 **Project Settings → API** 에서 두 가지를 메모합니다.

| 이름 | 어디에 사용 | 비고 |
|------|-------------|------|
| `Project URL` | 앱의 «Supabase 설정» 패널의 URL | 공개 가능 |
| `anon public` 키 | 앱의 «Supabase 설정» 패널의 anon key | 공개 가능 (RLS로 보호) |
| `service_role` 키 | **앱에 절대 넣지 말 것** | 서버측(Edge Function 등)에서만 사용 |

브라우저 코드(GitHub Pages)에는 **반드시 `anon public` 키만** 사용합니다.

## 4. 스키마 적용 (테이블/RLS)

1. 좌측 메뉴 **SQL Editor → + New query**.
2. 저장소의 [`supabase/migrations/001_initial_schema.sql`](../supabase/migrations/001_initial_schema.sql) 내용을 그대로 붙여넣고 **Run** 합니다.
3. 좌측 **Table Editor** 에서 `departments`, `employees`, `trips`, `countries`, `audit_logs` 가 생겼는지 확인합니다.
4. 좌측 **Authentication → Policies** 에서 각 테이블에 RLS 정책이 들어가 있는지 확인합니다.

## 5. 부서/관리자 데이터 시드(최소 1행)

다음 SQL을 SQL Editor에서 실행해 부서 1개를 등록합니다.

```sql
insert into public.departments (name)
values ('관리부')
on conflict (name) do nothing;
```

## 6. 첫 직원(관리자) 등록

### 6-1. Auth 사용자 생성

1. **Authentication → Users → Add user → Create new user**.
2. 입력
   - **Email**: 앱이 내부적으로 쓰는 로그인 문자열. 예: `admin_001@project.local` (실제 이메일이 아니어도 형식만 맞으면 OK)
   - **Password**: 초기 비밀번호 (예: `temp1234`, 운영 시 즉시 변경)
   - **Auto Confirm User**: **ON** (이메일 인증 생략)
3. 생성 후 행을 클릭해서 표시되는 **User UID** 를 복사합니다.

### 6-2. employees 행 추가

SQL Editor에서 아래를 실행합니다. `auth_user_id`, `department_id`, `name`, `login_email` 만 본인 환경에 맞게 바꿉니다.

```sql
insert into public.employees (department_id, name, role, login_email, auth_user_id, must_change_password)
select d.id, '홍길동', 'admin', 'admin_001@project.local', '여기에-Auth-UID-붙여넣기', true
from public.departments d
where d.name = '관리부';
```

같은 직원이 두 번 들어가지 않도록 `login_email` 은 유니크(이미 있는 값이면 거절됨)입니다.

## 7. 앱에서 연결 테스트

1. 로컬 또는 GitHub Pages에서 사이트를 엽니다.
2. 첫 화면 «Supabase 설정» 패널에 3번에서 메모한 **Project URL** 과 **anon public** 키를 붙여넣고 **설정 저장**.
3. 부서 드롭다운에 «관리부», 이름 드롭다운에 «홍길동» 이 보이면 OK.
4. 6-1의 초기 비밀번호로 로그인. `must_change_password=true` 라서 비밀번호 변경 탭으로 자동 이동합니다.

## 8. 추가 직원 등록 (반복 작업)

이후 직원은 6-1 → 6-2 패턴을 반복하면 됩니다. 부서장은 `role = 'department_manager'`, 일반 직원은 `role = 'employee'` 로 넣습니다. 자동화하려면 관리자 화면의 «직원 정보 등록» 폼에 미리 만든 Auth UID를 붙여넣는 것도 가능합니다.

## 9. 비밀번호 초기화 (관리자)

가장 단순한 방법은 콘솔에서 처리합니다.

1. **Authentication → Users → 해당 사용자 클릭 → ⋯ → Send password reset 또는 Update password**.
2. 변경 후 사용자에게 새 비밀번호를 알려 주고, 첫 로그인 후 본인이 다시 변경하도록 안내합니다.

앱에서 버튼으로 처리하고 싶다면, 추후 Edge Function을 추가해 service role 권한으로 처리하는 방식으로 확장합니다.

## 10. 자주 만나는 문제

- **로그인이 `Invalid login credentials` 로 실패**: `employees.login_email` 과 Auth 사용자의 Email 이 다른 경우. 두 값을 똑같이 맞춥니다.
- **로그인 후 화면이 비어 있음**: `employees.auth_user_id` 가 비어 있거나 다른 UID. `select * from employees` 로 확인.
- **출장 등록이 RLS 오류로 실패**: `employees.is_active` 가 `false` 이거나 `department_id` 가 비어 있음. 사용자 행을 `is_active = true` 로, 부서 ID도 채워 둡니다.
- **국가 드롭다운이 비어 있음**: 마이그레이션이 실패했거나 `countries.is_active = false`. SQL Editor에서 다시 실행하거나 데이터를 확인합니다.

## 11. 참고

- 무료 플랜은 사용량 한도가 있습니다(데이터 500MB, 월 활성 사용자 50,000 등). 자세한 한도는 [Pricing 페이지](https://supabase.com/pricing) 에서 확인합니다.
- 운영 정책상 비밀번호 평문은 어디에도 저장하지 않으며, `service_role` 키는 GitHub 저장소·`.env`·브라우저 어디에도 두지 않습니다.
