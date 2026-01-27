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

## Usage

```bash
# Generate sprite from config
figma-sprite build

# With custom config file
figma-sprite build -c custom.config.json

# Set Figma token via environment variable
FIGMA_TOKEN=your_token_here figma-sprite build
```

## Configuration

Create a `figma.sprite.config.json` file in your project root:

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
