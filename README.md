# Figma Sprite Tool

CLI tool to generate PNG/SVG sprite sheets, SCSS mixins, and JSON metadata from Figma design systems.

## Quick Example

```bash
# 1. Install
npm install --save-dev figma-sprite-tool

# 2. Setup
npx figma-sprite init

# 3. Set token
export FIGMA_TOKEN="your-figma-token"

# 4. Generate!
npx figma-sprite generate
```

## Features

- **Single Source of Truth**: Use Figma as your design system source
- **Deterministic Output**: Same input always produces the same output
- **Multiple Formats**: Generate PNG (@1x/@2x), SVG sprites, SCSS mixins, and JSON metadata
- **Type-Safe**: Built with TypeScript in strict mode
- **Fast**: Optimized with Sharp for image processing

## Requirements

- Node.js 20 LTS or higher
- pnpm 8.x or higher
- Figma account with API access token

## Installation

### 🚀 Quick Start (Recommended)

**로컬 설치 + npx 사용** - 가장 간편하고 권장하는 방법입니다!

```bash
# 1. 프로젝트에 설치
npm install --save-dev figma-sprite-tool

# 2. npx로 바로 사용 (추가 설정 불필요!)
npx figma-sprite init
npx figma-sprite generate
```

> 💡 **Why npx?**
> - 전역 설치 불필요
> - 프로젝트별 버전 관리 가능
> - `package.json`에 스크립트 추가 없이 바로 사용 가능
> - 팀원들도 `npm install` 후 바로 사용 가능

### 다른 설치 방법

<details>
<summary><strong>전역 설치 (Global Installation)</strong></summary>

```bash
npm install -g figma-sprite-tool
```

Verify installation:
```bash
figma-sprite --version
figma-sprite init  # npx 없이 바로 사용 가능
```

</details>

<details>
<summary><strong>npm scripts 사용 (팀 프로젝트 권장)</strong></summary>

```bash
# 1. 로컬 설치
npm install --save-dev figma-sprite-tool

# 2. package.json에 스크립트 추가
{
  "scripts": {
    "sprite:init": "figma-sprite init",
    "sprite": "figma-sprite generate"
  }
}

# 3. npm run으로 실행
npm run sprite:init
npm run sprite
```

</details>

## Environment Setup

### Figma Token

Get your token from: https://www.figma.com/developers/api#access-tokens

#### Windows (Git Bash)
```bash
export FIGMA_TOKEN="your-token-here"
```

Make persistent:
```bash
echo 'export FIGMA_TOKEN="your-token-here"' >> ~/.bashrc
```

#### Windows (CMD)
```cmd
set FIGMA_TOKEN=your-token-here
```

Make persistent:
```cmd
setx FIGMA_TOKEN "your-token-here"
```

#### macOS/Linux
```bash
export FIGMA_TOKEN="your-token-here"
```

Make persistent:
```bash
echo 'export FIGMA_TOKEN="your-token-here"' >> ~/.bashrc
```

⚠️ **Never commit tokens to git!**

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Lint code
pnpm lint

# Format code
pnpm format
```

## Getting Started

### Quick Start (Recommended)

1. **Install to your project**:
   ```bash
   npm install --save-dev figma-sprite-tool
   ```

2. **Run interactive setup**:
   ```bash
   npx figma-sprite init
   ```

3. **Follow the prompts** to configure your project:
   - Enter your Figma file URL
   - Specify the page containing icons
   - Choose icon name prefix for filtering
   - Select icon ID format
   - Set output directory

4. **Set your Figma token**:
   ```bash
   export FIGMA_TOKEN="your-figma-token"
   ```
   Get your token from: https://www.figma.com/developers/api#access-tokens

5. **Generate sprites**:
   ```bash
   npx figma-sprite generate
   ```

> 💡 **Tip**: `npx` 명령어를 사용하면 전역 설치 없이도 로컬에 설치된 도구를 바로 실행할 수 있습니다!

### Manual Configuration (Advanced)

If you prefer to create the configuration file manually, create a `figma.sprite.config.json` file in your project root:

**Step 1: Install**
```bash
npm install --save-dev figma-sprite-tool
```

**Step 2: Create config file**

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

**Step 3: Set token and run**
```bash
export FIGMA_TOKEN="your-figma-token"
npx figma-sprite generate
```

## Usage

### Available Commands

**로컬 설치 후 npx 사용 (권장):**

```bash
# Create configuration interactively
npx figma-sprite init

# Generate sprite from config
npx figma-sprite generate
# or
npx figma-sprite build  # alias for generate

# With custom config file
npx figma-sprite generate -c custom.config.json

# With output directory override
npx figma-sprite generate -o ./custom-output

# Verbose mode for debugging
npx figma-sprite generate --verbose

# Dry run (preview without writing files)
npx figma-sprite generate --dry-run

# Set Figma token via environment variable
FIGMA_TOKEN=your_token_here npx figma-sprite generate
```

**전역 설치한 경우:**

```bash
# npx 없이 바로 사용 가능
figma-sprite init
figma-sprite generate
```

## Output Files

The tool generates the following files:

```
assets/sprite/{Page}/
├── sprite.png                # 1x PNG sprite sheet (packed layout)
├── sprite@2x.png             # 2x retina PNG sprite sheet (packed layout)
├── sprite.preview.png        # Preview PNG sprite sheet (grid layout)
├── sprite.svg                # SVG symbol sprite (root viewBox included)
├── sprite.preview.svg        # Preview grid SVG for viewers and backgrounds
├── sprite.scss               # Sprite data maps ($icons, $preview-icons)
├── mixins.scss               # PNG/SVG/Preview mixin APIs
└── sprite.json               # Metadata + all coordinates + failedAssets report
```

Notes:
- Output directory is page-scoped: `{output.dir}/{sanitized-page-name}`.
- If `sprite.*` already exists, a suffix is applied automatically (`sprite(1)`, `sprite(2)`, ...).
- If some assets fail export, generation continues with successful assets and failure details are recorded.

### Usage Guides

For detailed usage instructions on how to use generated sprite files:
- 🇰🇷 [스프라이트 사용 가이드 (한국어)](./docs/SPRITE_USAGE_GUIDE.md)
- 🇬🇧 [Sprite Usage Guide (English)](./docs/SPRITE_USAGE_GUIDE_EN.md)

## Troubleshooting

### Command not found: figma-sprite

**Problem**: `figma-sprite: command not found` 에러가 발생합니다.

**가장 쉬운 해결 방법**:
```bash
# 로컬 설치 후 npx 사용 (권장)
npm install --save-dev figma-sprite-tool
npx figma-sprite init  # ✅ 작동!
```

**다른 해결 방법**:
- 전역 설치: `npm install -g figma-sprite-tool` → `figma-sprite init` 직접 사용 가능
- npm scripts: package.json에 `"scripts": { "sprite": "figma-sprite generate" }` 추가 후 `npm run sprite`
- PATH 확인: `which figma-sprite` (전역 설치 시)

### Figma token not found

**Problem**: FIGMA_TOKEN environment variable not set.

**Solutions**:
1. Get token from: https://www.figma.com/developers/api#access-tokens
2. Set environment variable (see [Environment Setup](#environment-setup))
3. Or add to config: `{ "figma": { "personalAccessToken": "..." } }`

### Configuration file not found

**Problem**: `figma.sprite.config.json` missing.

**Solutions**:
- Run: `figma-sprite init`
- Or create config manually (see [Manual Configuration (Advanced)](#manual-configuration-advanced))

### Permission denied (Windows)

**Problem**: Execution policy blocks scripts.

**Solution** (PowerShell as Administrator):
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Architecture

- **CLI Layer**: Commander.js for command-line interface
- **Engine Layer**: Core orchestration and workflow management
- **Processor Layer**: Specialized processors for Figma API, sprite generation, and output

## Tech Stack

- **Runtime**: Node.js 20 LTS
- **Language**: TypeScript 5.x (strict mode)
- **Build Tool**: tsup
- **Package Manager**: pnpm 8.x
- **Image Processing**: Sharp
- **Bin-packing**: potpack
- **SVG Optimization**: SVGO
- **Config Validation**: Zod
- **Template Engine**: Handlebars
- **Testing**: Vitest

## License

MIT
