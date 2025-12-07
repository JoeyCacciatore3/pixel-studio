# Contributing to Pixel Studio

Thank you for your interest in contributing to Pixel Studio! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Be patient and understanding

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm or yarn
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/pixel-studio.git
   cd pixel-studio
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a new branch for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Code Quality Checks

Before committing, ensure all checks pass:

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Formatting
npm run format:check

# Tests
npm run test
```

### Git Hooks

This project uses Husky for git hooks:

- **Pre-commit**: Automatically runs lint-staged (ESLint, Prettier, TypeScript)
- **Pre-push**: Runs type-check and tests

Hooks are automatically set up when you run `npm install` (via the `prepare` script).

## Making Changes

### Branch Naming

Use descriptive branch names:

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/documentation-update` - Documentation changes
- `refactor/refactoring-description` - Code refactoring

### Commit Messages

Follow conventional commit format:

```
type(scope): subject

body (optional)

footer (optional)
```

Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:

```
feat(tools): add new brush tool
fix(canvas): resolve selection rendering issue
docs(readme): update installation instructions
```

### Code Style

- Follow the existing code style (see [STYLE_GUIDE.md](STYLE_GUIDE.md) in this directory)
- Use TypeScript for all new code
- Write meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and small
- Follow the `.cursorrules` file when using Cursor IDE

### Testing

- Write tests for new features
- Ensure all existing tests pass
- Aim for good test coverage
- Test edge cases and error conditions

## Submitting Changes

### Pull Request Process

1. Ensure your code follows the project standards
2. Update documentation if needed
3. Run all quality checks locally
4. Push your branch to your fork
5. Create a Pull Request with:
   - Clear title and description
   - Reference to related issues
   - Screenshots if UI changes
   - Testing instructions

### PR Review

- Address review comments promptly
- Keep PRs focused and reasonably sized
- Update your branch if conflicts arise
- Respond to feedback constructively

## Project Structure

```
pixel-studio/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   ├── lib/             # Core application logic
│   │   ├── tools/       # Tool implementations
│   │   └── types.ts     # TypeScript types
│   └── test/            # Test utilities
├── .github/             # GitHub workflows and templates
└── public/              # Static assets
```

## Architecture Guidelines

### Module Pattern

Core logic uses the IIFE (Immediately Invoked Function Expression) module pattern for encapsulation.

### Tool System

Tools are self-registering and follow a standard interface. See existing tools in `src/lib/tools/` for examples.

### Component Structure

- Use functional components with hooks
- Keep components focused and reusable
- Extract complex logic into custom hooks or utilities
- Use TypeScript interfaces for props

## Cursor IDE and AI-Assisted Development

### Using .cursorrules

This project includes a `.cursorrules` file that guides AI assistants (like Cursor IDE's AI) to follow project-specific conventions. When using Cursor IDE:

1. The AI will automatically follow the rules defined in `.cursorrules`
2. Code suggestions will align with project architecture and patterns
3. TypeScript strict mode and best practices are enforced
4. Project-specific patterns (IIFE modules, tool system) are respected

### MCP Agent Integration

This project supports Model Context Protocol (MCP) agents for enhanced development:

#### Available MCP Agents

- **Context7**: Access up-to-date library documentation
  - Use for: Next.js, TypeScript, React best practices
  - Example: "What are the best practices for Next.js App Router?"

- **Brave Search**: Web search for examples and solutions
  - Use for: Finding code examples, troubleshooting
  - Example: "How to implement canvas drawing in React?"

- **Firecrawl**: Scrape and extract content from web pages
  - Use for: Documentation extraction, research
  - Example: "Get the content from the Next.js documentation page"

- **Sentry**: Error tracking and monitoring (if configured)
  - Use for: Production error analysis
  - Example: "Show me recent errors in production"

#### Using MCP Agents in Development

When working with MCP agents:

1. **Context7**: Ask for library-specific documentation

   ```
   "What are the TypeScript best practices for React 19?"
   ```

2. **Brave Search**: Search for examples and solutions

   ```
   "Find examples of canvas drawing with React hooks"
   ```

3. **Firecrawl**: Extract content from documentation

   ```
   "Get the Next.js Image component documentation"
   ```

4. Always verify MCP-provided code against:
   - Project's `.cursorrules` file
   - TypeScript strict mode requirements
   - Project architecture patterns
   - Existing code style

#### MCP Configuration

MCP agents are configured in `~/.cursor/mcp.json`. The project uses:

- Context7 for documentation
- Brave Search for web search
- Firecrawl for content extraction
- Sentry for error tracking (if configured)

## Questions?

- Open an issue for bug reports or feature requests
- Check existing issues before creating new ones
- Be specific and provide context in issue descriptions
- Refer to [STYLE_GUIDE.md](STYLE_GUIDE.md) in this directory for code style questions

## License

By contributing, you agree that your contributions will be licensed under the ISC License.
