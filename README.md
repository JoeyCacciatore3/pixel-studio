# Pixel Studio

A professional pixel art editor built with Next.js, TypeScript, and React.

## Features

- **Drawing Tools**: Pencil, Eraser, Paint Bucket
- **Selection Tools**: Magic Wand, Color Range, Rectangular Selection
- **Utility Tools**: Color Picker, Move Tool
- **Advanced Features**:
  - Undo/Redo system
  - Zoom controls
  - Canvas resize
  - Image upload
  - Export to PNG
  - Keyboard shortcuts

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage

## Keyboard Shortcuts

- `B` - Pencil tool
- `E` - Eraser tool
- `G` - Paint Bucket
- `I` - Color Picker
- `W` - Magic Wand
- `R` - Color Range
- `M` - Selection tool
- `V` - Move tool
- `Ctrl/Cmd + Z` - Undo
- `Ctrl/Cmd + Shift + Z` - Redo
- `[` - Decrease brush size
- `]` - Increase brush size
- `Delete/Backspace` - Delete selection
- `Escape` - Clear selection

## Architecture

The application uses a modular architecture with:

- **Module Pattern (IIFE)**: Core logic modules (Canvas, History, UI, App)
- **React Components**: UI rendering and user interactions
- **Tool System**: Self-registering tools with standard interface
- **TypeScript**: Full type safety with strict mode

## Code Quality

This project includes:

- **TypeScript** with strict mode
- **ESLint** for code linting
- **Prettier** for code formatting
- **Husky** for git hooks
- **lint-staged** for pre-commit checks
- **GitHub Actions** for CI/CD
- **Vitest** for testing
- **EditorConfig** for consistent editor behavior
- **.cursorrules** for AI-assisted development guidance

## Development Tools

### Cursor IDE Integration

This project includes a `.cursorrules` file that provides comprehensive guidance for AI-assisted development in Cursor IDE. The rules cover:

- TypeScript/React/Next.js best practices
- Project-specific architecture patterns
- Code organization and file structure
- Error handling patterns
- Testing requirements
- Performance optimization
- Accessibility standards

When using Cursor IDE, the AI assistant will automatically follow these rules to ensure consistent, high-quality code generation.

### MCP Agent Integration

The project is configured to work with Model Context Protocol (MCP) agents for enhanced development assistance:

- **Context7**: Library documentation and best practices
- **Brave Search**: Finding examples and solutions
- **Firecrawl**: Scraping documentation
- **Sentry**: Error tracking and monitoring (if configured)

See [CONTRIBUTING.md](CONTRIBUTING.md) for more details on using MCP agents.

### Node Version Management

This project uses Node.js 20. Use `nvm` to ensure you're using the correct version:

```bash
nvm use
```

Or install the version specified in `.nvmrc`:

```bash
nvm install
```

## Additional Scripts

- `npm run validate` - Run all quality checks (type-check, lint, format, test)
- `npm run check` - Run validation and build
- `npm run audit` - Check for security vulnerabilities
- `npm run clean` - Remove build artifacts and cache
- `npm run analyze` - Analyze bundle size

## Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [STYLE_GUIDE.md](STYLE_GUIDE.md) - Code style and conventions
- [CHANGELOG.md](CHANGELOG.md) - Project changelog
- [SECURITY.md](SECURITY.md) - Security policy

## License

ISC
