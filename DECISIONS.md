# 결정 기록 (ADR 스타일)

중요한 설계·기술 선택은 "왜 그렇게 했는지"를 남겨 두면, 나중에 같은 논의를 반복하지 않을 수 있습니다.

## 형식 예시

### ADR-001: 제목

- **상태:** 제안됨 / 수락됨 / 대체됨 / 폐기됨
- **맥락:** 결정이 필요했던 상황
- **결정:** 선택한 방안
- **결과:** 기대 효과와 트레이드오프

---

### ADR-002: 데이터 저장소로 Supabase 무료 플랜 사용

- **상태:** 수락됨
- **맥락:** 직원·부서장·관리자가 같은 출장 데이터를 공유해야 하지만, 운영 서버를 별도로 두기 어렵고 GitHub Pages 정적 호스팅을 그대로 활용하고 싶음.
- **결정:** PostgreSQL/Auth/Edge Functions가 모두 무료로 제공되는 Supabase 무료 플랜을 사용. 정적 프론트엔드는 anon key 만 사용하고, 보안은 RLS로 제어.
- **결과:** 별도 백엔드 없이 인증·DB·권한을 한 번에 해결. 무료 플랜의 사용량 제한, service role key의 외부 노출 금지에 주의해야 함.

### ADR-003: 로그인 단순화 — Supabase Auth + 직원 행 1:1 연결

- **상태:** 수락됨
- **맥락:** 자체 비밀번호 해시·세션 발급을 구현하면 코드량과 보안 부담이 커짐. PROJECT_CONTEXT의 로그인 UX는 부서/이름/비밀번호 3단계.
- **결정:** 직원 1명당 Supabase Auth 사용자 1개를 만들고, `employees.auth_user_id` 와 `employees.login_email` 로 매핑. 화면 UX는 부서/이름 드롭다운 + 비밀번호로 두고 내부적으로 `signInWithPassword` 호출.
- **결과:** 비밀번호 저장·검증·재설정을 모두 Supabase Auth가 처리. 직원 추가는 1단계에서는 콘솔로 수동 처리하고, 필요 시 Edge Function으로 자동화.

### ADR-004: GitHub Pages 정적 SPA + 런타임 Supabase 설정

- **상태:** 수락됨
- **맥락:** 정적 파일만 호스팅하면서도 Supabase URL/anon key를 안전하고 유연하게 주입해야 함.
- **결정:** `src/config.js` 의 `DEFAULT_SUPABASE_URL`, `DEFAULT_SUPABASE_ANON_KEY` 를 비워 두고, 화면의 설정 패널에서 입력받아 브라우저 `localStorage` 에 보관. service role key는 절대 브라우저에 두지 않음.
- **결과:** 단일 정적 빌드로 여러 환경을 지원. 사용자는 처음 한 번만 값을 입력하면 됨. 비밀이 아닌 anon key만 노출되므로 보안은 RLS로 보장.
