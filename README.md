# KIS Football League (KFL)

KFL은 KIS 풋볼 리그의 경기와 팀 정보를 한곳에서 볼 수 있도록 만든 웹앱입니다. 경기 일정과 실시간 스코어, 리그 순위, 선수 기록, 경기 하이라이트를 제공하며, 관리자 화면에서 리그 데이터를 관리할 수 있습니다.

## 주요 기능

- 경기 일정, 결과, 실시간 스코어와 경기 이벤트
- 리그 순위 및 선수 득점·도움 기록
- 팀과 선수 정보, 경기 하이라이트
- 관리자 데이터 관리 화면
- 오프라인 캐시와 홈 화면 설치를 지원하는 PWA

## 기술 스택

- **화면:** HTML5, CSS3, Vanilla JavaScript
- **데이터 및 인증:** Supabase Database, Auth, Realtime
- **웹 앱 기능:** Service Worker 기반 캐시, Web App Manifest
- **호스팅:** GitHub Pages

별도의 프런트엔드 프레임워크나 빌드 도구 없이 동작하는 정적 웹앱입니다. 브라우저에서 사용하는 Supabase publishable key(또는 기존 anon key)는 공개 정보이며, 실제 데이터 접근 권한은 Supabase의 Row Level Security 정책으로 제한해야 합니다. `service_role` 또는 `secret` 키는 클라이언트 코드나 공개 저장소에 포함하면 안 됩니다.
