# 구현 로드맵

> **⚠️ 중요 원칙**: 각 Phase는 한번 정의되면 가급적 수정하지 않습니다. 새로운 작업이 필요한 경우 새로운 Phase를 추가하거나 별도 문서로 관리합니다.

---

## Phase 1: 프로젝트 초기화 (1-2일)

- package.json 설정 (pnpm)
- TypeScript 설정 (strict 모드)
- 프로젝트 구조 생성
- 기본 의존성 설치
- tsup 빌드 설정
- Vitest 테스트 설정

## Phase 2: 핵심 타입 & Config (2-3일)

- Zod 스키마 정의
- TypeScript 타입 정의
- Config 로더 구현
- Config 검증 로직
- 에러 클래스 정의

## Phase 3: Figma API 통합 (3-4일)

- Figma REST API 클라이언트 래퍼
- 파일 트리 조회 로직
- 이미지 내보내기 요청
- 병렬 다운로드 구현
- 재시도 로직 (지수 백오프)
- 모의 응답으로 유닛 테스트

## Phase 4: 스프라이트 생성 (4-5일)

- potpack 통합
- Sharp를 사용한 PNG 합성
- Retina (@2x) 생성
- SVG 심볼 스프라이트 생성
- SVGO 최적화 통합
- 결정론성 테스트

## Phase 5: 출력 생성 (2-3일)

- Handlebars 템플릿 작성
- SCSS 생성기 구현
- JSON 메타데이터 생성기
- 해시 계산 (SHA-256)
- 파일 쓰기 (Windows 경로 처리)

## Phase 6: CLI 레이어 (2일)

- Commander.js 설정
- Generate 커맨드 구현
- 진행률 표시기
- 컬러 로거
- 에러 메시지 포매팅

## Phase 7: 검증 & 테스트 (3-4일)

- 중복 ID 감지기
- ID 형식 검증
- 통합 테스트
- E2E 테스트
- 예제 config 및 출력 생성

---

**총 예상 기간:** 2-3주

---

## 진행 상황 추적

각 Phase의 진행 상황은 이 섹션에 체크리스트로 관리합니다.

### ✅ Phase 1: 프로젝트 초기화
- [x] package.json 설정
- [x] TypeScript 설정
- [x] 프로젝트 구조 생성
- [x] 의존성 설치 (실행 필요: `pnpm install`)
- [x] tsup 설정
- [x] Vitest 설정

### ✅ Phase 2: 핵심 타입 & Config
- [x] Zod 스키마 (schema.ts - SpriteConfigSchema, validateConfig, parseConfig)
- [x] TypeScript 타입 (config.ts, sprite.ts, figma.ts - 완전한 타입 시스템)
- [x] Config 로더 (loader.ts - loadConfig, loadConfigFromPath, 자동 발견)
- [x] Config 검증 (Zod 기반 유효성 검사, 상세한 에러 메시지)
- [x] 에러 클래스 (errors.ts - SpriteError with E1xx-E5xx 코드 체계)
- [x] **테스트 결과**: 43/43 passing ✅
- [x] **상세 문서**: [PHASE2_SUMMARY.md](./PHASE2_SUMMARY.md)

### ✅ Phase 3: Figma API 통합
- [x] API 클라이언트 (client.ts - FigmaClient with retry support)
- [x] 파일 트리 조회 (parser.ts - parseIconNodes, variant parsing)
- [x] 이미지 내보내기 (exporter.ts - PNG/SVG export with batch processing)
- [x] 병렬 다운로드 (parallel batch downloads with concurrency control)
- [x] 재시도 로직 (retry.ts - exponential backoff, rate limit handling)
- [x] 유닛 테스트 (109/121 passing - 90% coverage)
- [x] **테스트 결과**: 109/121 passing (⚠️ 12 tests need fixes)
- [x] **상세 문서**: [PHASE3_SUMMARY.md](./PHASE3_SUMMARY.md)

### ✅ Phase 4: 스프라이트 생성
- [x] potpack 통합 (packer.ts - deterministic bin-packing)
- [x] PNG 합성 (png-generator.ts - Sharp composite API)
- [x] Retina 생성 (generatePngSprites - 1x and 2x)
- [x] SVG 스프라이트 (svg-generator.ts - symbol-based sprite)
- [x] SVGO 최적화 (conditional optimization with viewBox preservation)
- [x] 결정론성 테스트 (87/87 passing - determinism validated)
- [x] **테스트 결과**: 87/87 passing ✅
- [x] **상세 문서**: [PHASE4_SUMMARY.md](./PHASE4_SUMMARY.md)

### ✅ Phase 5: 출력 생성
- [x] Handlebars 템플릿 (sprite.scss.hbs - 레거시 @import 지원)
- [x] SCSS 생성기 (scss-generator.ts - Handlebars 통합, 레티나 지원)
- [x] JSON 생성기 (json-generator.ts - ISO 8601 타임스탬프, 알파벳 정렬)
- [x] 해시 계산 (hash-calculator.ts - SHA-256, 8자리 짧은 해시)
- [x] 파일 쓰기 (file-writer.ts - Windows 경로, 원자적 쓰기)
- [x] **테스트 결과**: 47/47 passing ✅
- [x] **상세 문서**: [PHASE5_SUMMARY.md](./PHASE5_SUMMARY.md)

### ✅ Phase 6: CLI 레이어
- [x] Commander 설정 (Commander.js 12.0, 버전/도움말 자동 처리)
- [x] Generate 커맨드 (전체 워크플로우 통합, --verbose/--dry-run 지원)
- [x] 진행률 표시기 (TTY/CI 감지, 단계별 상태 표시)
- [x] 컬러 로거 (picocolors, 심볼 기반 메시지)
- [x] 에러 포매팅 (SpriteError 컨텍스트 + 제안 표시)
- [x] **테스트 결과**: 41/41 passing ✅
- [x] **CLI 실행**: `node dist/index.js --help` 정상 작동 ✅
- [x] **상세 문서**: [PHASE6_SUMMARY.md](./PHASE6_SUMMARY.md)

### ⏳ Phase 7: 검증 & 테스트
- [ ] 중복 ID 감지
- [ ] ID 검증
- [ ] 통합 테스트
- [ ] E2E 테스트
- [ ] 예제 생성