# PWA Web Wrapper

웹 어플리케이션을 PWA(Progressive Web App) 환경으로 전달하는 래퍼 웹사이트입니다.

## 기능

- URL 입력으로 웹 어플리케이션 로드
- 전체화면 모드 지원
- PWA 설치 가능
- 오프라인 캐싱 지원 (Service Worker)
- 반응형 디자인
- 마지막 로드한 URL 저장

## 사용 방법

1. 웹사이트에 접속
2. 웹 어플리케이션 URL 입력 (예: https://example.com)
3. "실행" 버튼 클릭
4. 전체화면 모드로 웹 어플리케이션 사용

## 툴바 기능

- **뒤로가기 (←)**: 이전 페이지로 이동
- **새로고침 (⟳)**: 현재 페이지 새로고침
- **전체화면 (⛶)**: 전체화면 모드 토글
- **닫기 (✕)**: 웹 어플리케이션 닫고 메인 화면으로 돌아가기

## 파일 구조

```
claudeCode4web/
├── index.html          # 메인 HTML 페이지
├── app.js              # JavaScript 로직
├── styles.css          # CSS 스타일시트
├── manifest.json       # PWA Manifest
├── service-worker.js   # Service Worker
└── README.md           # 이 파일
```

## PWA 설치

1. Chrome/Edge 브라우저에서 웹사이트 접속
2. 주소창 오른쪽의 설치 아이콘 클릭
3. "설치" 버튼 클릭
4. 독립 실행 앱으로 사용 가능

## 아이콘 설정

PWA가 완전히 작동하려면 아이콘 파일이 필요합니다:

- `icon-192.png` (192x192 픽셀)
- `icon-512.png` (512x512 픽셀)

이미지 편집 도구를 사용하여 원하는 아이콘을 만들고 프로젝트 루트에 저장하세요.

## 기술 스택

- HTML5
- CSS3 (Flexbox, Grid, Animations)
- JavaScript (ES6+)
- PWA (Service Worker, Manifest)

## 브라우저 호환성

- Chrome/Edge (권장)
- Firefox
- Safari (일부 PWA 기능 제한)

## 주의사항

- iframe 내 웹사이트는 X-Frame-Options 정책에 따라 로드되지 않을 수 있습니다
- HTTPS가 필요한 기능들이 있으므로 HTTPS로 호스팅하는 것을 권장합니다
- Service Worker는 HTTPS 또는 localhost에서만 작동합니다

## 라이선스

MIT License
