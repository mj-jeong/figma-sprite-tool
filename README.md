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

```bash
pnpm install
```

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
assets/sprite/
├── sprite.png           # 1x PNG sprite sheet
├── sprite@2x.png        # 2x retina PNG sprite sheet
├── sprite.svg           # SVG symbol sprite
├── sprite.scss          # SCSS mixins with retina support
└── sprite.json          # Metadata with hashes for change detection
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
