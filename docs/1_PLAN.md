# 📦 Figma Sprite Automation MVP Spec

Figma 디자인 시스템을 단일 원천(SSoT)으로 삼아
PNG / SVG 스프라이트 이미지와 SCSS mixin, JSON 메타데이터를
CLI 실행만으로 결정론적으로 생성하는 자동화 도구의 MVP 사양서

## 1. 목표 (MVP Scope)

### 입력
- 프로젝트 repo에 정의된 Figma 타겟(config 파일)
- Figma REST API (fileKey + page 기준)
- 아이콘 네이밍 규칙 + variant 규칙

### 출력 (repo에 커밋)
```
assets/sprite/
 ├─ sprite.png
 ├─ sprite@2x.png
 ├─ sprite.svg
 ├─ sprite.scss
 └─ sprite.json
```

### 사용 방식
```bash
npm run sprite
# 또는
npx figma-sprite build
```

## 2. config 스키마 (최종)

### figma.sprite.config.json
```json
{
  "figma": {
    "fileKey": "AbCdEf123456",
    "page": "Design System / Icons",
    "scope": {
      "type": "prefix",
      "value": "ic/"
    }
  },
  "output": {
    "dir": "assets/sprite",
    "name": "sprite"
  },
  "formats": {
    "png": {
      "enabled": true,
      "scale": 2,
      "padding": 2
    },
    "svg": {
      "enabled": true,
      "svgo": true
    }
  },
  "naming": {
    "idFormat": "{name}-{size}-{style}{theme?--{theme}}",
    "sanitize": true
  }
}
```

### 필드 설명

- **figma.fileKey**
  - Figma 파일 식별자 (필수)

- **figma.page**
  - 아이콘이 위치한 페이지 경로

- **scope**
  - 아이콘 필터 기준
  - prefix: 이름이 특정 prefix로 시작하는 노드만 수집

- **formats.png.scale**
  - 2 → retina 스프라이트 생성

- **naming.idFormat**
  - variant를 최종 아이콘 ID로 변환하는 규칙

- **sanitize**
  - 특수문자 제거 / kebab-case 변환

## 3. 산출물: sprite.json (자동화 핵심)

### 용도
- 변경 감지(diff)
- 중복 탐지
- CI 리포트
- 향후 MCP/LLM 자동화 확장

### 최소 스키마
```json
{
  "meta": {
    "fileKey": "AbCdEf123456",
    "page": "Design System / Icons",
    "generatedAt": "2026-01-23T13:00:00+09:00",
    "png": { "scale": 2, "padding": 2 }
  },
  "icons": {
    "ic-home-24-line": {
      "nodeId": "123:456",
      "variants": { "size": 24, "style": "line" },
      "png": { "x": 12, "y": 8, "w": 24, "h": 24 },
      "svg": { "symbolId": "ic-home-24-line", "viewBox": "0 0 24 24" },
      "hash": { "svg": "…", "png": "…" }
    }
  }
}
```

## 4. SCSS 템플릿 ( @import 기반, 레티나 지원 )

### sprite.scss (자동 생성)
```scss
// --------------------------------------------------
// Auto-generated file. DO NOT EDIT.
// Source: Figma
// --------------------------------------------------

$sprite-image: "./sprite.png";
$sprite-image-2x: "./sprite@2x.png";
$sprite-width: 1024px;
$sprite-height: 512px;

$icons: (
  "ic-home-24-line": (x: 12px, y: 8px, w: 24px, h: 24px),
  "ic-search-24-line": (x: 44px, y: 8px, w: 24px, h: 24px),
);

// 내부 헬퍼
@function _icon($name) {
  @return map-get($icons, $name);
}

// public mixin
@mixin sprite-icon($name) {
  $icon: _icon($name);

  @if $icon == null {
    @error "Sprite icon `#{$name}` not found.";
  }

  width: map-get($icon, w);
  height: map-get($icon, h);
  background-image: url(#{$sprite-image});
  background-repeat: no-repeat;
  background-position: -#{map-get($icon, x)} -#{map-get($icon, y)};
  background-size: $sprite-width $sprite-height;

  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    background-image: url(#{$sprite-image-2x});
  }
}
```

### 사용 예
```scss
.icon-home {
  @include sprite-icon("ic-home-24-line");
}
```

## 5. SVG 스프라이트 생성 규칙

- **출력**: `sprite.svg`
- `<symbol id="...">` 방식
- id = 최종 아이콘 ID
- viewBox 유지
- svgo로 정규화(옵션)

### 사용 예
```html
<svg><use href="sprite.svg#ic-home-24-line" /></svg>
```
## 6. 중복 처리 정책 (중요)

### 기본 원칙
- **ID 충돌 = 빌드 실패**
- 같은 ID에 서로 다른 nodeId 존재 시 에러

### 중복 에러 UX (예시)
```
[figma-sprite] Duplicate icon id detected: ic-home-24-line

Found in:
- nodeId: 123:456 (Design System / Icons)
- nodeId: 789:101 (Design System / Legacy Icons)

Resolution:
- Use a single source component in Design System
- Or rename icon variants to avoid collision
```

### 해시 중복
- 해시 동일 + ID 다름 → 경고만 출력
- 자동 병합은 MVP에서 하지 않음

## 7. CLI 동작 플로우

1. config 로드 + 검증
2. Figma file tree 조회
3. page → scope 기준으로 아이콘 노드 수집
4. PNG / SVG export + 다운로드
5. SVG sprite 생성
6. PNG sprite packing + 이미지 생성
7. sprite.json 생성
8. sprite.scss 생성
9. 결과물 output dir에 저장

## 8. 프로젝트 적용 가이드

### 설치
```bash
npm i -D @org/figma-sprite
```

### package.json 설정
```json
{
  "scripts": {
    "sprite": "figma-sprite build"
  }
}
```

### 실행
```bash
FIGMA_TOKEN=xxxx npm run sprite
```