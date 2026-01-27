주어진 @1_PLAN.md와 아래 'Figma Sprite CLI Tool 명세서'를 자세히 분석하고 다음 인사이트를 응답하세요.

<당신의 임무>
주어진 MVP 를 분석해 작업할 프로젝트에 구현하기 위해 필요한 {기술스택, 라이브러리} 를 도출하세요.

<반드시 지켜야할 규칙>
- 먼저 상급자에게 보고하기위한 간략한 개요를 응답하세요. 이 내용만으로도 대략적 평가가 가능해야합니다.
- 도출된 결론의 장점, 예상되는 한계점을 함께 응답하세요.
- 이후 자세한 내용을 응답하세요. 어떤 결정을 내렸다면 반드시 이유도 포함하세요.
- 해당 내용을 다각도로 피드백하기위한 AI 프롬프트를 작성하세요. 평가할 AI의 역할 및 임무를 자세하게 작성해야합니다.


--- 

# Figma Sprite CLI Tool 명세서

## 개요

Figma Design System에서 Figma REST API를 사용하여 PNG/SVG 스프라이트 이미지, SCSS 믹스인, JSON 메타데이터를 직접 생성하는 Node.js + TypeScript CLI 도구입니다.

---

## 목표

Figma REST API를 통해 디자인 시스템의 아이콘을 자동으로 추출하고, 프로덕션에서 사용 가능한 스프라이트 에셋을 생성합니다.

---

## 제약 조건

| 항목 | 설명 |
|------|------|
| API | Figma REST API (fileKey + page) 사용 |
| 플러그인 | Figma Plugin 사용 불가 |
| 인터페이스 | CLI 기반 (`figma-sprite build`) |
| 출력 일관성 | 결정론적 출력 (동일 입력 = 동일 출력) |
| SCSS 문법 | 레거시 `@import` 사용 (`@use` 사용 안 함) |

---

## 입력

### 1. 설정 파일
- **파일명**: `figma.sprite.config.json`
- **스키마**: 별도 정의 필요

### 2. 환경 변수
- **FIGMA_TOKEN**: Figma Personal Access Token

---

## 출력

저장소에 커밋되는 에셋 구조:

```
assets/sprite/
├─ sprite.png        # 1x PNG 스프라이트
├─ sprite@2x.png     # 2x Retina PNG 스프라이트
├─ sprite.svg        # SVG 심볼 스프라이트
├─ sprite.scss       # SCSS 믹스인
└─ sprite.json       # JSON 메타데이터
```

---

## 주요 기능

### 아이콘 필터링
- 이름 prefix로 아이콘 노드 필터링

### 베리언트 지원
- Size (크기)
- Style (스타일)
- Theme (테마)

### 생성 항목

| 파일 | 설명 |
|------|------|
| PNG 스프라이트 | `background-position` 데이터 포함 |
| SVG 스프라이트 | `<symbol>` 기반 스프라이트 |
| SCSS 믹스인 | `@mixin sprite-icon($id)` |
| JSON 메타데이터 | 좌표, nodeId, hash 정보 |

### 에러 처리
- 중복 아이콘 ID 감지 시 명확한 에러 메시지와 함께 빌드 실패

### 최적화
- **svgo**: SVG 최적화 (선택 사항)
- **Retina 지원**: 2x PNG 생성

---

## 구현 요구 사항

### 아키텍처
- **engine**과 **cli** 분리 구조

### 이미지 처리
- PNG 합성: `sharp` 라이브러리 사용

### 패킹 알고리즘
- 안정적인(stable) bin-packing 알고리즘 사용
- 패킹 전 아이콘을 최종 ID 기준으로 정렬

### 템플릿
- 템플릿 기반 SCSS 생성

---

## 산출물

1. **CLI 소스 코드**
2. **Engine 소스 코드**
3. **예제 설정 파일** (`figma.sprite.config.json`)
4. **예제 생성 파일** (sprite.png, sprite.svg, sprite.scss, sprite.json)

---

## 개발 원칙

> 명세를 정확히 따르고, **정확성**, **유지보수성**, **명확한 에러 UX**를 우선시합니다.