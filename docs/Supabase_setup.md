# Supabase 설정 가이드

## 1. 프로젝트 생성

1. https://supabase.com 에 로그인합니다.
2. 새 프로젝트를 생성합니다.
3. Region은 한국 사용 기준 `Northeast Asia (Seoul)` 또는 가까운 리전을 권장합니다.
4. Pricing plan은 Free로 시작할 수 있습니다.

## 2. API 값 확인

Supabase Dashboard의 **Project Settings > API**에서 아래 값을 확인합니다.

| 값 | 사용 위치 | 주의 |
| --- | --- | --- |
| Project URL | `src/config.js`의 `DEFAULT_SUPABASE_URL` | 공개 가능 |
| publishable/anon key | `src/config.js`의 `DEFAULT_SUPABASE_ANON_KEY` | 공개 가능하나 RLS 필수 |
| service_role key | 브라우저 앱에서 사용 금지 | 저장소/브라우저/.env에 넣지 않음 |

현재 앱은 정적 브라우저 앱이므로 publishable/anon key는 최종 사용자 브라우저에서 보일 수 있습니다. 보안은 Supabase RLS 정책으로 보호합니다.

## 3. 클라이언트 설정 파일

`src/config.js`에 실제 Supabase Project URL과 publishable/anon key를 입력합니다.

```js
export const DEFAULT_SUPABASE_URL = "https://your-project.supabase.co";
export const DEFAULT_SUPABASE_ANON_KEY = "your-publishable-or-anon-key";
```

두 값은 브라우저 앱에서 공개될 수 있는 클라이언트 설정입니다. `service_role` 키와 혼동하지 않습니다.

## 4. 마이그레이션 적용

Supabase SQL Editor에서 아래 순서대로 실행합니다.

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_mark_own_password_changed_rpc.sql`
3. `supabase/migrations/003_employee_login_id.sql`
4. `supabase/migrations/004_position_and_companies.sql`
5. `supabase/migrations/005_admin_trip_insert.sql`
6. `supabase/migrations/006_expand_default_countries.sql`
7. `supabase/migrations/007_trips_select_all_authenticated.sql`
8. `supabase/migrations/008_employee_trip_table_full_visibility.sql`
9. `supabase/migrations/009_restore_employee_login_lookup_policy.sql`

중요:

- `007`, `008`은 직원 화면에서도 전체 출장자 현황을 볼 수 있게 하는 정책입니다.
- `009`는 로그인 화면에서 직원 ID 조회가 되도록 복구하는 정책입니다.

## 5. 관리자 계정

앱 로그인 화면에서는 ID에 `admin`을 입력합니다.  
내부 Supabase Auth 이메일은 `admin@project.local`입니다.

1. **Authentication > Users > Add user**에서 사용자를 생성합니다.
2. Email: `admin@project.local`
3. Password: 운영자가 정한 6자리 이상 비밀번호
4. Auto Confirm User: ON
5. `supabase/seed/default_admin.sql`을 실행해 `employees` 행과 Auth 사용자를 연결합니다.

## 6. 직원 등록

관리자 화면에서 직원 등록 시 아래 값을 입력합니다.

- 부서
- 직급
- ID
- 직원명
- 초기 비밀번호

앱은 직원 ID를 소문자로 정규화하고 내부 Auth 이메일을 `직원ID@project.local` 형태로 생성합니다.

## 7. 비밀번호 변경

`business-trip.html`, `admin-business-trip.html`, `admin-manage.html`에서 현재접속자 아래 `[비밀번호 변경]` 버튼을 제공합니다.

변경 방식:

1. 현재 비밀번호 입력
2. 새로운 비밀번호 입력
3. 새 비밀번호는 최소 6자리 이상
4. 현재 비밀번호가 Supabase Auth에서 검증되면 새 비밀번호로 저장
5. `mark_own_password_changed` RPC를 호출해 `must_change_password`를 해제

## 8. 관리자 직원 Auth 자동 생성

`admin-manage.html`에서 직원을 수동 저장하거나 엑셀 업로드할 때 Auth 계정도 자동 생성/갱신하려면 Edge Function을 배포합니다.

```powershell
supabase functions deploy admin-upsert-employee-auth
```

Function Secret에는 `SUPABASE_SERVICE_ROLE_KEY`를 설정합니다. 이 값은 Supabase Dashboard의 Project Settings > API에서 확인하며, 저장소/브라우저 코드/.env에는 넣지 않습니다.

```powershell
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="service-role-key"
```

동작 방식:

- 앱은 직원 ID에 `@project.local`을 붙여 Auth 이메일을 만듭니다. 예: `hj.kang` → `hj.kang@project.local`
- 브라우저는 로그인한 관리자 세션으로 Edge Function을 호출합니다.
- Edge Function은 호출자가 활성 관리자 계정인지 확인합니다.
- 확인 후 서버 쪽 `service_role` 권한으로 Auth 사용자를 생성하거나 기존 사용자의 비밀번호를 재설정합니다.

## 9. 문제 해결

- 로그인 시 “등록된 직원 ID가 아닙니다.”가 나오면 `009_restore_employee_login_lookup_policy.sql` 적용 여부를 확인합니다.
- 직원 화면에서 본인 부서 출장만 보이면 `007`, `008` 적용 여부를 확인합니다.
- 국가 목록이 부족하면 `006_expand_default_countries.sql` 적용 여부를 확인합니다.
- 업체명 참조 드롭다운이 비어 있으면 `companies` 테이블과 `is_active` 값을 확인합니다.
- 출장 저장 시 기간 겹침 오류가 나오면 메시지에 표시되는 충돌 출장 정보를 확인합니다.
- 직원 업로드 시 “Auth 계정 자동 생성/비밀번호 설정에 실패했습니다.”가 나오면 `admin-upsert-employee-auth` Edge Function 배포와 `SUPABASE_SERVICE_ROLE_KEY` Secret 설정을 확인합니다.

## 10. 보안 주의

- 비밀번호 평문은 저장하지 않습니다.
- `service_role` 키는 절대 클라이언트에 넣지 않습니다.
- Supabase URL과 anon/public key는 클라이언트에 공개될 수 있습니다. `service_role` 키는 절대 클라이언트에 넣지 않습니다.
