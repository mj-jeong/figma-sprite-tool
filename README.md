# Figma Sprite Tool

CLI tool to generate PNG/SVG sprite sheets, SCSS mixins, and JSON metadata from Figma design systems.

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

### For End Users

#### Global Installation (Recommended)
```bash
npm install -g figma-sprite-tool
```

Verify installation:
```bash
figma-sprite --version
```

#### Use with npx (No Installation)
```bash
npx figma-sprite-tool init
npx figma-sprite-tool generate
```

#### Project-Local Installation
```bash
npm install --save-dev figma-sprite-tool
```

Add to package.json:
```json
{
  "scripts": {
    "sprite": "figma-sprite generate"
  }
}
```

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

1. **Run interactive setup**:
   ```bash
   figma-sprite init
   ```

2. **Follow the prompts** to configure your project:
   - Enter your Figma file URL
   - Specify the page containing icons
   - Choose icon name prefix for filtering
   - Select icon ID format
   - Set output directory

3. **Set your Figma token**:
   ```bash
   export FIGMA_TOKEN="your-figma-token"
   ```
   Get your token from: https://www.figma.com/developers/api#access-tokens

4. **Generate sprites**:
   ```bash
   figma-sprite generate
   ```

### Manual Configuration (Advanced)

If you prefer to create the configuration file manually, create a `figma.sprite.config.json` file in your project root:

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

## Usage

### Available Commands

```bash
# Create configuration interactively
figma-sprite init

# Generate sprite from config
figma-sprite generate
# or
figma-sprite build  # alias for generate

# With custom config file
figma-sprite generate -c custom.config.json

# With output directory override
figma-sprite generate -o ./custom-output

# Verbose mode for debugging
figma-sprite generate --verbose

# Dry run (preview without writing files)
figma-sprite generate --dry-run

# Set Figma token via environment variable
FIGMA_TOKEN=your_token_here figma-sprite generate
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

**Problem**: Package not installed or not in PATH.

**Solutions**:
- Install globally: `npm install -g figma-sprite-tool`
- Use npx: `npx figma-sprite-tool [command]`
- Check PATH: `which figma-sprite` (should show path)

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
