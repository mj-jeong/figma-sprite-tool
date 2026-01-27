# Figma Sprite Tool - 수동 테스트 가이드

## 📋 사전 준비

### 1. Figma Token 발급

1. [Figma 설정](https://www.figma.com/settings)으로 이동
2. **Personal access tokens** 섹션 찾기
3. **Generate new token** 클릭
4. Token 이름 입력 (예: "sprite-tool-test")
5. 생성된 토큰 복사 (한 번만 표시됨!)

### 2. 환경 변수 설정

**Windows (Git Bash / PowerShell)**:
```bash
# Git Bash
export FIGMA_TOKEN="your-token-here"

# PowerShell
$env:FIGMA_TOKEN="your-token-here"

# 또는 .env 파일 생성
echo "FIGMA_TOKEN=your-token-here" > .env
```

### 3. Figma File Key 확인

Figma 파일 URL 형식: `https://www.figma.com/file/{FILE_KEY}/...`

예: `https://www.figma.com/file/AbCdEf123456/Design-System`
→ FILE_KEY = `AbCdEf123456`

---

## 🚀 테스트 시나리오

### Scenario 1: 기본 테스트 (최소 설정)

**1. Config 파일 생성**

`figma.sprite.config.json`:
```json
{
  "figma": {
    "fileKey": "YOUR_FILE_KEY",
    "page": "Page 1",
    "scope": {
      "type": "prefix",
      "value": ""
    }
  },
  "output": {
    "dir": "output",
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
    "idFormat": "{name}",
    "sanitize": true
  }
}
```

**2. 실행**:
```bash
node dist/index.js generate

# 또는 verbose 모드
node dist/index.js generate --verbose
```

**3. 예상 출력**:
```
output/
├── sprite.png
├── sprite@2x.png
├── sprite.svg
├── sprite.scss
└── sprite.json
```

---

### Scenario 2: 실전 테스트 (Design System)

**1. Config 수정** (`figma.sprite.config.json`):
```json
{
  "figma": {
    "fileKey": "YOUR_FILE_KEY",
    "page": "Design System / Icons",
    "scope": {
      "type": "prefix",
      "value": "ic/"
    }
  },
  "output": {
    "dir": "assets/sprite",
    "name": "icon"
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
    "idFormat": "{name}-{size}-{style}",
    "sanitize": true
  }
}
```

**2. 실행**:
```bash
node dist/index.js generate -c figma.sprite.config.json
```

---

### Scenario 3: Dry Run (미리보기)

파일을 생성하지 않고 결과 미리보기:

```bash
node dist/index.js generate --dry-run
```

---

## ✅ 검증 체크리스트

### 출력 파일 검증

- [ ] **sprite.png**: 1x PNG 스프라이트 생성되었는가?
- [ ] **sprite@2x.png**: 2x Retina PNG 스프라이트 생성되었는가?
- [ ] **sprite.svg**: SVG 심볼 스프라이트 생성되었는가?
- [ ] **sprite.scss**: SCSS 파일에 올바른 믹스인이 있는가?
- [ ] **sprite.json**: 메타데이터 JSON이 생성되었는가?

### 내용 검증

**1. sprite.scss 확인**:
```scss
// 다음 요소들이 있어야 함
$sprite-image: "./sprite.png";
$sprite-image-2x: "./sprite@2x.png";
$icons: ( ... );
@mixin sprite-icon($name) { ... }
@media (-webkit-min-device-pixel-ratio: 2) { ... }
```

**2. sprite.svg 확인**:
```xml
<svg xmlns="http://www.w3.org/2000/svg">
  <symbol id="..." viewBox="...">
    <!-- SVG content -->
  </symbol>
</svg>
```

**3. sprite.json 확인**:
```json
{
  "meta": {
    "fileKey": "...",
    "generatedAt": "...",
    ...
  },
  "icons": {
    "icon-name": {
      "nodeId": "...",
      "png": { "x": ..., "y": ... },
      "svg": { "symbolId": "...", "viewBox": "..." },
      "hash": { ... }
    }
  }
}
```

### 기능 검증

- [ ] **결정론적 생성**: 같은 config로 2번 실행 시 동일한 결과?
- [ ] **중복 ID 감지**: 중복된 아이콘 이름 있을 시 에러 발생?
- [ ] **Retina 지원**: @2x 이미지가 2배 크기인가?
- [ ] **ViewBox 보존**: SVG 심볼에 viewBox 속성 있는가?

---

## 🐛 문제 해결

### 일반적인 에러

**[E101] Config not found**
→ `figma.sprite.config.json` 파일 경로 확인

**[E201] Figma auth failed**
→ `FIGMA_TOKEN` 환경 변수 확인
→ Token이 유효한지 확인

**[E202] File not found**
→ `fileKey` 값이 정확한지 확인
→ Figma 파일 접근 권한 확인

**[E204] Node not found**
→ `page` 경로가 정확한지 확인 (대소문자 구분)
→ `scope.value` prefix가 실제 아이콘 이름과 일치하는지 확인

**[E301] Duplicate icon id detected**
→ Figma에서 중복된 아이콘 이름 제거
→ 또는 `naming.idFormat`을 수정하여 고유한 ID 생성

---

## 📊 성능 측정

실행 시간 측정:
```bash
time node dist/index.js generate
```

예상 성능:
- 10개 아이콘: ~5초
- 50개 아이콘: ~15초
- 100개 아이콘: ~30초

---

## 🔍 Verbose 모드로 디버깅

상세 로그 확인:
```bash
node dist/index.js generate --verbose
```

출력 예시:
```
ℹ Config path: figma.sprite.config.json
ℹ Figma file key: AbCdEf123456
ℹ Target page: Design System / Icons
ℹ Scope: prefix = "ic/"
ℹ Icons found: 45
ℹ Sprite dimensions: 1024x512
ℹ Packing efficiency: 87.3%
```

---

## 📝 테스트 결과 보고

테스트 완료 후 다음 정보를 기록해주세요:

1. **Figma 파일 정보**:
   - 아이콘 개수: _____
   - 페이지 구조: _____

2. **실행 결과**:
   - 성공/실패: _____
   - 실행 시간: _____
   - 에러 메시지 (있는 경우): _____

3. **출력 파일 크기**:
   - sprite.png: _____ KB
   - sprite@2x.png: _____ KB
   - sprite.svg: _____ KB
   - sprite.scss: _____ KB
   - sprite.json: _____ KB

4. **발견된 이슈**:
   - _____

---

## 💡 테스트 팁

1. **작은 파일로 시작**: 5-10개 아이콘으로 먼저 테스트
2. **Dry Run 활용**: `--dry-run`으로 미리 확인
3. **Verbose 모드**: 문제 발생 시 `--verbose`로 상세 로그 확인
4. **결정론성 검증**: 같은 명령을 2번 실행하여 결과 비교
5. **Git Diff**: 생성된 파일을 Git으로 추적하여 변경사항 확인

---

Happy Testing! 🎉
