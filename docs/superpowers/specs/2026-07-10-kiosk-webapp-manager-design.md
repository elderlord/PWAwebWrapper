# Kiosk WebApp Manager - Design Specification

**Date:** 2026-07-10  
**Author:** System Design  
**Status:** Approved

## 1. Project Overview

### 1.1 Purpose
전시/키오스크 환경을 위한 PWA 기반 웹 어플리케이션 관리 시스템. iPad에 설치하여 관람객에게는 웹앱만 표시하고, 관리자만 숨겨진 제스처로 웹앱을 관리할 수 있는 시스템.

### 1.2 Key Requirements
- iPad PWA로 설치 가능
- 키오스크 모드: 관람객은 웹앱만 전체화면으로 볼 수 있음
- 관리자 모드: 히든 터치로 진입, URL 추가/삭제/전환 가능
- 다중 웹앱 관리 (동적 추가/삭제)
- 완전 오프라인 작동 (localStorage 기반)
- 네트워크 오류 시 자동 재시도

### 1.3 Target Environment
- Device: iPad (landscape orientation)
- Browser: Safari (PWA mode)
- Network: WiFi (자동 재시도로 불안정한 네트워크 대응)

---

## 2. Architecture

### 2.1 File Structure
```
claudeCode4web/
├── index.html              # 메인 HTML (키오스크 + 관리 모드)
├── styles/
│   ├── kiosk.css          # 키오스크 모드 스타일
│   └── admin.css          # 관리 모드 스타일
├── js/
│   ├── app.js             # 메인 앱 로직 (모드 전환)
│   ├── kiosk-mode.js      # 키오스크 모드 컨트롤러
│   ├── admin-mode.js      # 관리 모드 컨트롤러
│   ├── storage.js         # localStorage 관리
│   └── hidden-touch.js    # 히든 터치 감지
├── manifest.json          # PWA manifest
├── service-worker.js      # Service worker (오프라인 캐싱)
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-07-10-kiosk-webapp-manager-design.md
└── README.md
```

### 2.2 Core Components

#### App.js (Main Controller)
- 앱 초기화
- 모드 전환 관리
- 이벤트 라우팅

#### Kiosk Mode Controller
- 웹앱 iframe 렌더링
- 전체화면 모드 유지
- 히든 터치 감지 위임

#### Admin Mode Controller
- 웹앱 리스트 UI
- CRUD 작업 처리
- 설정 관리

#### Storage Manager
- localStorage 읽기/쓰기
- 데이터 검증
- 기본값 처리

#### Hidden Touch Detector
- 터치 이벤트 감지
- 영역 및 타이밍 검증
- 활성화 콜백 실행

### 2.3 Data Flow
```
앱 시작
  ↓
Storage.loadConfig()
  ↓
기본 웹앱 있음? → YES → KioskMode.loadWebapp(defaultId)
                ↓ NO  → KioskMode.showWelcome()
  ↓
[키오스크 모드 활성]
  ↓
HiddenTouch 감지 → App.switchToAdminMode()
  ↓
[관리 모드 활성]
  ↓
웹앱 선택/추가/삭제 → Storage.save()
  ↓
[닫기] → App.switchToKioskMode(selectedWebappId)
```

---

## 3. Data Model

### 3.1 localStorage Schema

#### Key: `kiosk_webapps`
```json
[
  {
    "id": "webapp_1234567890",
    "name": "전시 소개",
    "url": "https://example.com/intro",
    "createdAt": "2026-07-10T10:30:00Z"
  },
  {
    "id": "webapp_9876543210",
    "name": "작품 갤러리",
    "url": "https://gallery.example.com",
    "createdAt": "2026-07-10T11:00:00Z"
  }
]
```

#### Key: `kiosk_default_webapp_id`
```json
"webapp_1234567890"
```

#### Key: `kiosk_hidden_touch`
```json
{
  "zone": "top-left",
  "tapCount": 5,
  "tapTimeout": 500
}
```

Possible zones: `top-left`, `top-right`, `bottom-left`, `bottom-right`

#### Key: `kiosk_settings`
```json
{
  "autoRetryEnabled": true,
  "retryInterval": 3000,
  "retryMaxAttempts": 10
}
```

### 3.2 Default Values
- `kiosk_webapps`: `[]`
- `kiosk_default_webapp_id`: `null`
- `kiosk_hidden_touch`: `{ zone: "top-left", tapCount: 5, tapTimeout: 500 }`
- `kiosk_settings`: `{ autoRetryEnabled: true, retryInterval: 3000, retryMaxAttempts: 10 }`

### 3.3 Data Validation
- URL: http/https 프로토콜만 허용
- ID: `webapp_${timestamp}` 형식, 중복 불가
- 이름: 1-50자
- 기본 웹앱 ID: 웹앱 리스트에 존재해야 함
- tapCount: 3-10 범위
- retryInterval: 1000-10000ms 범위

---

## 4. UI/UX Design

### 4.1 Initial Load Flow
```
앱 시작
  ↓
웹앱 리스트 확인
  ↓
[비어있음] → 환영 화면
            "관리자 모드에서 첫 웹앱을 추가하세요"
            (히든 터치 힌트 표시)
  ↓
[있음] → 기본 웹앱 자동 로드
        ↓
        키오스크 모드 (전체화면)
```

### 4.2 Kiosk Mode (Visitor View)

**Layout:**
```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│         [웹앱 iframe 100%]          │
│                                     │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

**Features:**
- 완전 전체화면 (UI 요소 없음)
- iframe sandbox: `allow-same-origin allow-scripts allow-forms`
- 새 창/팝업 차단 (`allow-popups` 제외)
- 히든 터치 영역만 투명하게 존재

### 4.3 Hidden Touch Mechanism

**Touch Zones (15% of screen):**
```
┌──────┬─────────────────┬──────┐
│ TL   │                 │   TR │
│      │                 │      │
├──────┤                 ├──────┤
│      │                 │      │
│      │                 │      │
│      │                 │      │
├──────┤                 ├──────┤
│ BL   │                 │   BR │
└──────┴─────────────────┴──────┘
```

**Activation:**
- Default: Top-Left zone
- 5 taps within 500ms
- Optional: Small dot feedback on each tap
- Success → Admin mode modal opens

**Collision Prevention:**
- Disable iOS system gestures (multi-touch, context menu, double-tap zoom)
- Narrow activation area (15% of screen)
- Short timeout (500ms for 5 taps)
- Configurable zone (security through obscurity)

### 4.4 Admin Mode UI

**Modal Layout:**
```
┌─────────────────────────────────────────┐
│  관리자 모드                   [닫기 ✕] │
├─────────────────────────────────────────┤
│                                         │
│  [웹앱 관리] [설정]                      │
│                                         │
│  ┌─ 웹앱 관리 ──────────────────────┐   │
│  │                                  │   │
│  │  등록된 웹앱:                     │   │
│  │                                  │   │
│  │  ┌─────────────────────────────┐│   │
│  │  │ ○ 전시 소개                  ││   │
│  │  │   https://example.com/intro  ││   │
│  │  │   [편집] [삭제]              ││   │
│  │  └─────────────────────────────┘│   │
│  │                                  │   │
│  │  ┌─────────────────────────────┐│   │
│  │  │ ● 작품 갤러리 (기본)         ││   │
│  │  │   https://gallery.com        ││   │
│  │  │   [편집] [삭제]              ││   │
│  │  └─────────────────────────────┘│   │
│  │                                  │   │
│  │  [+ 새 웹앱 추가]                │   │
│  │  [선택한 웹앱 열기]              │   │
│  └──────────────────────────────────┘   │
│                                         │
│  ┌─ 설정 ────────────────────────────┐  │
│  │  히든 터치 위치: [좌측상단 ▼]     │  │
│  │  탭 횟수: [5]                     │  │
│  │  자동 재시도: [●켜짐 ○꺼짐]      │  │
│  │  재시도 간격: [3초] ──────○──     │  │
│  │  최대 재시도: [10회]              │  │
│  └───────────────────────────────────┘  │
│                                         │
│               [앱 종료]                  │
└─────────────────────────────────────────┘
```

**Tab 1: 웹앱 관리**
- 웹앱 리스트 (스크롤 가능)
- 각 항목: 이름, URL, 편집/삭제 버튼
- 라디오 버튼: 기본 웹앱 선택
- [+ 새 웹앱 추가]: 입력 폼 모달 오픈
- [선택한 웹앱 열기]: 즉시 키오스크 모드 전환

**Tab 2: 설정**
- 히든 터치 위치: 드롭다운 (4개 구역)
- 탭 횟수: 숫자 입력 (3-10)
- 자동 재시도: 토글 스위치
- 재시도 간격: 슬라이더 (1-10초)
- 최대 재시도: 숫자 입력 (1-20)

**Bottom Actions:**
- [앱 종료]: 확인 다이얼로그 → PWA 닫기 안내

### 4.5 Add/Edit Webapp Flow

**Add:**
```
[+ 새 웹앱 추가] 클릭
  ↓
모달 오픈:
  이름: [____________________]
  URL:  [____________________]
  [취소] [추가]
  ↓
Validation:
  - URL 형식 검사 (http/https)
  - 중복 URL 체크
  - 이름 길이 검사 (1-50자)
  ↓
[추가] 클릭 → storage.addWebapp()
  ↓
리스트 새로고침
```

**Edit:**
```
[편집] 클릭
  ↓
모달 오픈 (기존 값 채워짐):
  이름: [기존 이름__________]
  URL:  [기존 URL___________]
  ○ 기본 웹앱으로 설정
  [취소] [저장]
  ↓
Validation (동일)
  ↓
[저장] 클릭 → storage.updateWebapp(id)
  ↓
리스트 새로고침
```

**Delete:**
```
[삭제] 클릭
  ↓
확인 다이얼로그:
  "정말 삭제하시겠습니까?"
  [취소] [삭제]
  ↓
[삭제] 확인 → storage.deleteWebapp(id)
  ↓
기본 웹앱이었다면:
  → 경고: "다른 웹앱을 기본으로 설정하세요"
  ↓
리스트 새로고침
```

---

## 5. Error Handling

### 5.1 Network Error Flow
```
iframe.onerror 발생
  ↓
showRetryOverlay()
  - 반투명 오버레이 표시
  - "연결 중..." 메시지
  - 로딩 스피너
  ↓
startAutoRetry()
  - settings.retryInterval 마다 재시도
  - 기본 웹앱 재로드 시도
  - 재시도 카운트 표시 (선택사항)
  ↓
성공 → 오버레이 제거, 키오스크 모드 복원
  ↓
실패 (maxAttempts 도달) → showPermanentError()
  - "네트워크 연결을 확인하세요"
  - 관리자 모드 안내 (히든 터치)
```

### 5.2 localStorage Errors

**Quota Exceeded:**
```
try {
  localStorage.setItem(key, value);
} catch (e) {
  if (e.name === 'QuotaExceededError') {
    alert('저장 공간 부족. 일부 웹앱을 삭제하세요.');
  }
}
```

**Data Corruption:**
```
try {
  data = JSON.parse(localStorage.getItem(key));
} catch (e) {
  console.error('Data corruption, resetting to defaults');
  storage.reset();
}
```

### 5.3 Invalid State Recovery

**No Default Webapp:**
- 앱 시작 시 기본 웹앱이 없으면 환영 화면 표시
- 관리자 모드 진입 안내

**Default Webapp Deleted:**
- 삭제 시 경고 표시
- 다른 웹앱을 기본으로 설정하도록 강제

**Empty Webapp List:**
- 환영 화면 표시
- 첫 웹앱 추가 안내

---

## 6. PWA Configuration

### 6.1 manifest.json
```json
{
  "name": "Kiosk WebApp Manager",
  "short_name": "Kiosk",
  "description": "전시용 웹앱 키오스크 관리 시스템",
  "display": "standalone",
  "orientation": "landscape",
  "start_url": "/",
  "scope": "/",
  "background_color": "#000000",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

**Key Settings:**
- `display: "standalone"`: 브라우저 UI 제거
- `orientation: "landscape"`: iPad 가로 모드 고정
- `background_color: "#000000"`: 전시 환경에 적합한 검정색

### 6.2 Service Worker Strategy

**Cache Strategy:**
- **Cache-First**: 정적 리소스 (HTML, CSS, JS, images)
- **Network-Only**: iframe 내부 웹앱 콘텐츠 (캐시 안 함)

**Cached Resources:**
```javascript
const CACHE_NAME = 'kiosk-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles/kiosk.css',
  '/styles/admin.css',
  '/js/app.js',
  '/js/kiosk-mode.js',
  '/js/admin-mode.js',
  '/js/storage.js',
  '/js/hidden-touch.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];
```

**Update Strategy:**
- Service worker 업데이트 감지 시 자동 reload (skipWaiting)
- 사용자에게 영향 없이 백그라운드 업데이트

### 6.3 Offline Support

**App Shell:**
- 앱 자체(HTML/CSS/JS)는 완전 오프라인 작동
- 관리 모드는 네트워크 없이도 접근 가능

**Webapp Content:**
- iframe 내 웹앱은 네트워크 필요
- 오프라인 시 자동 재시도 메커니즘 작동

**localStorage:**
- 네트워크 상태와 무관하게 작동
- 설정 변경은 즉시 반영

---

## 7. Security & Safety

### 7.1 Visitor Restrictions
- 새 창/팝업 완전 차단
- iOS 시스템 제스처 비활성화
- 주소창/툴바 접근 불가 (PWA standalone mode)
- 히든 터치 영역 외 관리 기능 접근 불가

### 7.2 Admin Access Control
- 히든 터치만으로 관리 모드 진입
- PIN 없음 (물리적 접근 제어 가정)
- 히든 터치 위치 변경 가능 (보안 강화)

### 7.3 iframe Sandbox
```html
<iframe sandbox="allow-same-origin allow-scripts allow-forms">
```
- `allow-popups` 제외 → 새 창 차단
- `allow-top-navigation` 제외 → 전체 페이지 리디렉션 차단
- `allow-scripts` 포함 → 웹앱 정상 작동

### 7.4 XSS Prevention
- URL 입력 시 `https://` 프로토콜 강제
- `javascript:` URL 차단
- 관리 모드 입력값 sanitization

---

## 8. Implementation Considerations

### 8.1 Browser Compatibility
- Primary: Safari (iOS/iPadOS)
- PWA features: Fully supported on iOS 16.4+
- Service Worker: Fully supported
- localStorage: 5-10MB limit (충분함)

### 8.2 Performance
- 앱 시작 시간: < 1초 (정적 파일만)
- 웹앱 전환: < 500ms (iframe src 변경)
- 관리 모드 오픈: < 300ms (모달 애니메이션)

### 8.3 Scalability
- 웹앱 수: 최대 50개 (localStorage 제한 고려)
- 각 웹앱 메타데이터: ~200 bytes
- 총 데이터: < 10KB (localStorage 여유 충분)

### 8.4 Accessibility
- 키오스크 모드: 터치 최적화
- 관리 모드: 큰 터치 타겟 (최소 44x44px)
- 고대비 UI (전시 환경 조명 고려)

### 8.5 Testing
- Unit: storage.js 데이터 검증 로직
- Integration: 모드 전환, 웹앱 CRUD
- E2E: 키오스크 모드 → 히든 터치 → 관리 모드 → 웹앱 추가 → 전환
- Device: iPad Pro, iPad Air 실제 테스트

---

## 9. Future Enhancements (Out of Scope)

이번 구현에서는 제외하지만, 향후 고려 가능한 기능:

- **사용 로그**: 각 웹앱 방문 시간/횟수 기록
- **원격 관리**: 클라우드 동기화, 원격 설정 변경
- **PIN 보호**: 관리 모드 추가 인증
- **스크린샷 방지**: 전시 콘텐츠 보호
- **Idle 타임아웃**: 일정 시간 후 기본 웹앱으로 자동 복귀
- **다국어 지원**: 관리 UI 한/영 전환
- **웹앱 그룹**: 카테고리별 웹앱 조직화
- **순서 변경**: 드래그 앤 드롭으로 리스트 정렬

---

## 10. Success Criteria

구현 완료의 기준:

1. ✅ iPad에 PWA 설치 가능
2. ✅ 키오스크 모드에서 웹앱 전체화면 표시
3. ✅ 히든 터치로 관리 모드 진입
4. ✅ 웹앱 추가/편집/삭제 가능
5. ✅ 기본 웹앱 설정 및 자동 로드
6. ✅ 네트워크 오류 시 자동 재시도
7. ✅ 완전 오프라인 작동 (앱 자체)
8. ✅ 새 창/팝업 차단
9. ✅ iOS 제스처 충돌 방지
10. ✅ 설정 변경 가능 (히든 터치 위치, 재시도 설정)

---

## 11. Deployment

### 11.1 Hosting
- 정적 파일 호스팅 (GitHub Pages, Netlify, Vercel 등)
- HTTPS 필수 (PWA 요구사항)

### 11.2 Installation
1. Safari에서 웹사이트 접속
2. 공유 버튼 → "홈 화면에 추가"
3. 홈 화면 아이콘 탭 → PWA 실행

### 11.3 Initial Setup
1. 앱 실행 → 환영 화면
2. 히든 터치로 관리 모드 진입
3. 첫 웹앱 추가
4. 기본 웹앱으로 설정
5. 관리 모드 닫기 → 키오스크 모드 시작

---

## Appendix A: Technical Decisions

### Why localStorage instead of IndexedDB?
- 간단한 데이터 구조 (JSON만)
- 동기 API (코드 단순화)
- 충분한 용량 (< 10KB 사용)
- 브라우저 호환성 100%

### Why No Backend?
- 단일 기기 사용 (동기화 불필요)
- 오프라인 우선 설계
- 배포/유지보수 간소화
- 네트워크 의존성 제거

### Why iframe instead of window.open?
- 샌드박스 제어 가능
- 전체화면 유지
- 새 창 방지
- UI 일관성

### Why No PIN Protection?
- 물리적 접근 제어 가정 (전시 공간)
- 관리자만 히든 터치 위치 알고 있음
- UX 간소화 (빠른 관리)
- 필요시 추가 가능 (Future Enhancement)

---

**End of Design Specification**
