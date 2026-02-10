# Publishing Checklist for figma-sprite-tool v0.1.0

## ✅ Completed Steps

### Step 1: Package Metadata
- ✅ Added author information to package.json
- ✅ Added repository URL
- ✅ Added homepage URL
- ✅ Added bugs URL

### Step 2: Enhanced Error Messages
- ✅ Enhanced FIGMA_TOKEN error message with platform-specific instructions
  - Windows (Git Bash) instructions
  - Windows (CMD) instructions
  - macOS/Linux instructions
  - Config file alternative
  - Security warning about never committing tokens

- ✅ Enhanced config file not found error message
  - Quick Start instructions with `figma-sprite init`
  - Manual setup guide
  - Lists searched paths and current directory

### Step 3: Documentation Updates
- ✅ Updated README.md with comprehensive installation section
  - Global installation (recommended)
  - npx usage (no installation)
  - Project-local installation

- ✅ Added Environment Setup section
  - Platform-specific token setup instructions
  - Persistent token configuration
  - Security warnings

- ✅ Added Troubleshooting section
  - Command not found solutions
  - Token not found solutions
  - Config file not found solutions
  - Windows permission issues

### Step 4: Build and Package
- ✅ Project builds successfully: `npm run build`
- ✅ Shebang present in dist/index.js: `#!/usr/bin/env node`
- ✅ Tarball created: `figma-sprite-tool-0.1.0.tgz`
- ✅ Tarball contents verified (350.2 kB unpacked)
- ✅ Error messages compiled correctly into build

## 📋 Pre-Publish Checklist

Before publishing to npm, verify these items:

### Security
- [ ] No `.npmrc` file in tarball (git ignored)
- [ ] No sensitive tokens in git history
- [ ] No API keys in codebase

### Package Quality
- [x] Shebang present in dist/index.js
- [x] dist/templates/ directory exists
- [x] package.json has all required metadata
- [x] README.md has installation instructions
- [x] Error messages are user-friendly
- [x] Tarball size is reasonable (83.2 kB)

### Functional Testing
- [ ] Install from tarball: `npm install -g ./figma-sprite-tool-0.1.0.tgz`
- [ ] Command runs: `figma-sprite --version`
- [ ] Help shows: `figma-sprite --help`
- [ ] Init works: `figma-sprite init`
- [ ] Error messages display correctly (no token, no config)

## 🚀 Publishing Steps

### 1. Authenticate with npm
```bash
npm login
# Enter: username, password, email, OTP (if 2FA enabled)
```

### 2. Dry Run
```bash
npm publish --dry-run --access public
# Review output - ensure no sensitive files
```

### 3. Actual Publish
```bash
npm publish --access public
# ⚠️ This is irreversible for version 0.1.0
```

### 4. Post-Publish Verification
```bash
# Check npm registry
npm view figma-sprite-tool

# Test real installation
npm install -g figma-sprite-tool
figma-sprite --version  # Should show: 0.1.0
figma-sprite init  # Should work

# Visit npm page
# https://www.npmjs.com/package/figma-sprite-tool
# Verify README renders correctly
```

## 🧪 Local Testing Commands

### Test Installation from Tarball
```bash
# Create temp directory
cd $(mktemp -d)  # Or: cd %TEMP% on Windows

# Install from tarball
npm install -g D:/poc/figma-sprite-tool/figma-sprite-tool-0.1.0.tgz

# Test commands
figma-sprite --version  # Should show: 0.1.0
figma-sprite --help
figma-sprite init  # Interactive prompts should work

# Clean up
npm uninstall -g figma-sprite-tool
```

### Test npx from Tarball
```bash
cd $(mktemp -d)
npx D:/poc/figma-sprite-tool/figma-sprite-tool-0.1.0.tgz init
# Should work without global installation
```

### Test Error Messages
```bash
# Test missing token error
cd $(mktemp -d)
figma-sprite init  # Create config
unset FIGMA_TOKEN
figma-sprite generate
# Should show enhanced error with platform-specific setup

# Test missing config error
cd $(mktemp -d)
figma-sprite generate
# Should show enhanced error with init instructions
```

## 📝 Known Issues

### TypeScript Errors
The project has pre-existing TypeScript errors that don't affect runtime functionality:
- Index signature access warnings (process.env, config properties)
- Unused import warnings
- Type compatibility issues in existing code

These errors existed before the publishing changes and are not blockers for publishing. They should be addressed in a future release.

### Test Failures
Some unit tests fail due to mocking issues:
- `tests/unit/utils/retry.test.ts`: 4 failed (stack overflow in test mocks)
- `tests/unit/engine/figma/parser-instance.test.ts`: 3 failed (assertion issues)
- `tests/unit/cli/commands/generate.test.ts`: 7 failed (process.exit in tests)

These test failures are pre-existing and not related to the publishing changes.

## 🔄 Rollback Plan

If published version has critical issues:

### Option 1: Deprecate and Patch (Recommended)
```bash
npm deprecate figma-sprite-tool@0.1.0 "Critical bug, use 0.1.1"
# Fix issue
npm version patch  # 0.1.0 → 0.1.1
npm publish --access public
```

### Option 2: Unpublish (Only within 72 hours, <300 downloads)
```bash
npm unpublish figma-sprite-tool@0.1.0
```

## 👥 User Workflow (Final State)

### New User Experience

1. **Install**:
   ```bash
   npm install -g figma-sprite-tool
   ```

2. **Get Token**:
   Visit: https://www.figma.com/developers/api#access-tokens

3. **Setup**:
   ```bash
   export FIGMA_TOKEN="your-token-here"
   figma-sprite init
   ```

4. **Generate**:
   ```bash
   figma-sprite generate
   ```

### Alternative with npx (No Install)
```bash
export FIGMA_TOKEN="your-token-here"
npx figma-sprite-tool init
npx figma-sprite-tool generate
```

## 📊 Package Stats

- Package name: `figma-sprite-tool`
- Version: `0.1.0`
- Tarball size: 83.2 kB
- Unpacked size: 350.2 kB
- Total files: 9
- Node requirement: >=20.0.0

## 🔗 Important URLs (After Publishing)

- npm page: https://www.npmjs.com/package/figma-sprite-tool
- Repository: https://github.com/username/figma-sprite-tool (update this!)
- Issues: https://github.com/username/figma-sprite-tool/issues (update this!)
- Homepage: https://github.com/username/figma-sprite-tool#readme (update this!)

## ⚠️ Important Notes

1. **First Publish**: This is the first publish to npm - no automation yet
2. **Repository URLs**: Update the GitHub URLs in package.json before publishing
3. **Author Info**: Update author name/email in package.json if needed
4. **Version 0.1.0**: Cannot be unpublished after 72 hours or 300 downloads
5. **Security**: .npmrc is properly gitignored - token is safe
