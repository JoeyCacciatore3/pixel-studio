# Security Policy

## Supported Versions

We actively support security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do NOT open a public issue

**Do not** report security vulnerabilities through public GitHub issues. This could put users at risk.

### 2. Report privately

Please report security vulnerabilities using GitHub's private vulnerability reporting feature:
https://github.com/[your-org]/pixie/security/advisories/new

Alternatively, you can email security concerns to the repository maintainers through GitHub.

### 3. Include details

When reporting, please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### 4. Response time

We will acknowledge receipt of your report within 48 hours and provide an update on the status of the vulnerability within 7 days.

### 5. Disclosure

We will coordinate with you on the disclosure timeline. We aim to:

- Fix the vulnerability promptly
- Release a security patch
- Credit you for the discovery (if desired)

## Security Best Practices

### For Users

- Keep dependencies up to date: `npm audit` and `npm audit fix`
- Review security advisories regularly
- Use environment variables for sensitive data
- Never commit secrets or API keys
- Use HTTPS in production

### For Contributors

- Follow secure coding practices
- Review dependencies for known vulnerabilities
- Use `npm audit` before committing
- Never commit sensitive information
- Use `.env` files for local development (already in `.gitignore`)

## Security Features

This project implements several security measures:

- **Security Headers**: Configured in `next.config.js`
  - Strict-Transport-Security (HSTS with 2-year max-age and preload)
  - X-Frame-Options (SAMEORIGIN to prevent clickjacking)
  - X-Content-Type-Options (nosniff to prevent MIME sniffing)
  - X-XSS-Protection (1; mode=block)
  - Referrer-Policy (origin-when-cross-origin)
  - Permissions-Policy (restricts camera, microphone, geolocation)
  - Content-Security-Policy (CSP) - see below

- **Content Security Policy (CSP)**:
  - Configured in `next.config.js` with environment-aware directives
  - **Development**: Permissive CSP allowing HMR and development tools
    - Allows `unsafe-eval` and `unsafe-inline` for Next.js HMR
    - Allows localhost connections for WebSocket HMR
  - **Production**: More restrictive CSP while maintaining Next.js compatibility
    - Uses `script-src-elem` explicitly for better browser compatibility
    - Allows `unsafe-eval` (required for Next.js dynamic imports)
    - Allows `unsafe-inline` for Next.js CSS-in-JS
    - **Note**: Does NOT use `strict-dynamic` to avoid blocking Next.js scripts
    - Allows blob URLs for Web Workers and canvas operations
    - Allows data URIs for images and fonts
  - CSP directives include:
    - `script-src` and `script-src-elem`: Allow Next.js scripts
    - `style-src`: Allow inline styles (Next.js CSS-in-JS)
    - `img-src`: Allow data URIs and blob URLs for canvas
    - `worker-src`: Allow blob URLs for Web Workers
    - `connect-src`: Allow Google Fonts and same-origin
    - `upgrade-insecure-requests`: Production only

- **Dependency Management**:
  - Regular security audits via `npm audit`
  - Dependabot for automated updates
  - CI/CD checks for vulnerabilities

- **Type Safety**:
  - TypeScript strict mode
  - Input validation
  - Type guards for runtime checks

- **Content Security**:
  - Production-safe logging (no console output in production)
  - Sanitized user inputs
  - Proper error handling
  - Error boundaries with production error reporting hooks

## Known Security Considerations

### Canvas Operations

- Canvas operations are performed client-side
- No server-side image processing
- User-uploaded images are handled in the browser

### Data Storage

- No persistent data storage by default
- All operations are client-side
- Export functionality is local only

## Security Updates

Security updates will be:

- Released as patch versions (e.g., 0.1.0 → 0.1.1)
- Documented in [CHANGELOG.md](CHANGELOG.md)
- Tagged with `security` label
- Announced in release notes

## CSP Troubleshooting

If you encounter CSP violations in production:

1. **Check browser console** for specific CSP violation messages
2. **Verify environment**: Ensure `NODE_ENV=production` is set correctly
3. **Test in production build**: Run `npm run build && npm start` to test production CSP
4. **Check Next.js version**: CSP configuration is tested with Next.js 16
5. **Verify Web Workers**: Ensure `worker-src 'self' blob:` allows your workers
6. **Check canvas operations**: Ensure `img-src` allows `data:` and `blob:` URIs

### Common CSP Issues

- **Scripts blocked**: Verify `script-src-elem` includes `'unsafe-inline'` and `'self'`
- **Web Workers blocked**: Verify `worker-src` includes `'self' blob:`
- **Canvas operations fail**: Verify `img-src` includes `data: blob:`
- **Fonts not loading**: Verify `font-src` includes Google Fonts domains

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [Next.js CSP Documentation](https://nextjs.org/docs/app/guides/content-security-policy)
- [npm Security Best Practices](https://docs.npmjs.com/security-best-practices)

## Contact

For security concerns, please use GitHub's private vulnerability reporting:
https://github.com/[your-org]/pixie/security/advisories/new
