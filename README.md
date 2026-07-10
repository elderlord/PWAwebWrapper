# Kiosk WebApp Manager

iPad PWA 기반 키오스크 웹앱 관리 시스템

## 주요 기능

- **키오스크 모드**: 웹앱을 전체화면으로 표시 (관람객용)
- **관리자 모드**: 히든 터치로 진입, 웹앱 추가/편집/삭제
- **다중 웹앱**: 여러 웹앱을 등록하고 전환
- **오프라인 지원**: 앱 자체는 완전 오프라인 작동
- **자동 재시도**: 네트워크 오류 시 자동으로 재연결 시도
- **PWA 설치**: iPad 홈 화면에 앱처럼 설치 가능

## 설치 방법

### 1. 웹 호스팅

정적 파일을 HTTPS로 호스팅 (GitHub Pages, Netlify, Vercel 등)

### 2. iPad에 설치

1. Safari에서 웹사이트 접속
2. 공유 버튼(상단 중앙) → "홈 화면에 추가"
3. 이름 확인 후 "추가"
4. 홈 화면 아이콘 탭 → 전체화면 앱 실행

## 초기 설정

1. 앱 실행 → 환영 화면 표시
2. 좌측 상단 모서리를 5번 빠르게 탭 → 관리자 모드 진입
3. "+ 새 웹앱 추가" 클릭
4. 이름과 URL 입력 후 추가
5. 라디오 버튼으로 기본 웹앱 설정
6. "선택한 웹앱 열기" → 키오스크 모드 시작

## 사용법

### 키오스크 모드 (관람객)
- 웹앱이 전체화면으로 표시됩니다
- 터치 상호작용 가능 (웹앱 내부)
- 새 창/팝업은 자동 차단

### 관리자 모드 진입
- 기본: 좌측 상단 모서리를 5번 빠르게 탭 (500ms 이내)
- 설정 탭에서 위치 및 횟수 변경 가능

### 웹앱 관리
- **추가**: "+ 새 웹앱 추가" → 이름/URL 입력
- **편집**: 웹앱 항목에서 "편집" 클릭
- **삭제**: "삭제" 클릭 → 확인
- **기본 설정**: 라디오 버튼 선택

### 설정
- **히든 터치 위치**: 4개 모서리 중 선택
- **탭 횟수**: 3-10회 (기본 5회)
- **자동 재시도**: 네트워크 오류 시 자동 재연결
- **재시도 간격**: 1-10초 (기본 3초)
- **최대 재시도**: 1-20회 (기본 10회)

## 기술 스택

- **Frontend**: Vanilla JavaScript (ES6+), CSS3
- **Storage**: localStorage (no backend)
- **PWA**: manifest.json + service worker
- **Target**: iPad Safari (iOS 16.4+)

## 파일 구조

```
claudeCode4web/
├── index.html
├── manifest.json
├── service-worker.js
├── icon-192.png
├── icon-512.png
├── styles/
│   ├── kiosk.css
│   └── admin.css
├── js/
│   ├── app.js
│   ├── kiosk-mode.js
│   ├── admin-mode.js
│   ├── storage.js
│   └── hidden-touch.js
└── .superpowers/
    └── sdd/
        ├── spec.md
        └── plan.md
```

## 브라우저 호환성

- ✅ Safari (iOS/iPadOS 16.4+)
- ✅ Chrome (desktop, Android)
- ✅ Edge
- ⚠️ Firefox (일부 PWA 기능 제한)

## 보안

- iframe sandbox로 새 창/팝업 차단
- http/https URL만 허용 (javascript: 차단)
- iOS 시스템 제스처 비활성화 (멀티터치, 줌 등)
- 히든 터치 위치 변경 가능 (보안 강화)

## 제한사항

- localStorage 용량: ~5-10MB (웹앱 최대 50개)
- X-Frame-Options로 차단된 사이트는 로드 불가
- HTTPS 필수 (PWA 요구사항)

## 배포 방법

### GitHub Pages

1. GitHub 저장소 설정 → Pages
2. Source: Deploy from a branch
3. Branch: main (또는 원하는 브랜치)
4. 저장 후 제공된 URL 확인

### Netlify

1. [Netlify](https://netlify.com) 계정 생성
2. "New site from Git" 클릭
3. 저장소 연결 및 배포 설정
4. 자동 배포 완료

### Vercel

1. [Vercel](https://vercel.com) 계정 생성
2. "New Project" 클릭
3. 저장소 Import
4. 자동 배포 완료

## 문제 해결

### 웹앱이 로드되지 않음
- URL이 올바른지 확인 (http:// 또는 https://)
- 해당 웹사이트가 X-Frame-Options를 허용하는지 확인
- 네트워크 연결 상태 확인

### 히든 터치가 작동하지 않음
- 설정된 모서리를 정확히 탭하고 있는지 확인
- 탭 간격이 500ms 이내인지 확인 (빠르게 탭)
- 관리자 모드에서 설정 확인

### PWA 설치가 안 됨
- Safari 브라우저 사용 확인 (iOS)
- HTTPS로 호스팅되었는지 확인
- manifest.json과 service-worker.js가 올바르게 제공되는지 확인

## 라이선스

MIT License
