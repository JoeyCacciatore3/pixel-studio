# Deployment Guide

This project is optimized for deployment on **Vercel**, which provides the best experience for Next.js applications with automatic deployments, edge network, and zero configuration.

## Option 1: Vercel (Recommended - Primary Host)

Vercel is made by the Next.js team and provides the best experience for Next.js apps. Deployments happen automatically when you push to your repository.

### Quick Deploy

1. Go to [vercel.com](https://vercel.com)
2. Sign in with your GitHub account
3. Click "Add New Project"
4. Import your repository: `JoeyCacciatore3/pixel-studio`
5. Vercel will auto-detect Next.js settings
6. Click "Deploy"

That's it! Your site will be live in ~2 minutes.

### Automatic Deployments

- Every push to `master` branch = Production deployment
- Every pull request = Preview deployment
- Automatic HTTPS, CDN, and global edge network
- No manual workflow configuration needed - Vercel handles everything automatically

### Custom Domain

1. Go to your project settings in Vercel
2. Click "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

### Environment Variables

If you need environment variables:

1. In Vercel: Project Settings → Environment Variables
2. Add your variables
3. Redeploy (or wait for automatic deployment)

## Option 2: GitHub Pages (Alternative - Static Export Required)

**Note:** This project is currently configured for Vercel (server mode). To deploy to GitHub Pages, you would need to:

1. Modify `next.config.js` to enable static export (`output: 'export'`)
2. Disable image optimization
3. Set up a GitHub Actions workflow to build and deploy

For the best Next.js experience, we recommend using Vercel instead.

### Setup (if needed)

1. Go to your repository: `https://github.com/JoeyCacciatore3/pixel-studio`
2. Click **Settings** → **Pages**
3. Under **Build and deployment**, select:
   - **Source**: Deploy from a branch
   - **Branch**: `gh-pages` / `/ (root)`
4. Click **Save**

### Your Site URL

After deployment, your site would be available at:

- `https://joeycacciatore3.github.io/pixel-studio/`

## Option 3: Netlify

1. Go to [netlify.com](https://netlify.com)
2. Sign in with GitHub
3. Click "Add new site" → "Import an existing project"
4. Select your repository
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
6. Click "Deploy site"

## Manual Deployment with Vercel CLI

The repository includes a `vercel.json` configuration file. You can also deploy manually using:

```bash
npm install -g vercel
vercel
```

## Build Configuration

The project is configured with:

- **Framework**: Next.js 16
- **Node Version**: 20
- **Build Command**: `npm run build`
- **Install Command**: `npm ci`

All settings are in `vercel.json` and can be customized in the Vercel dashboard. Vercel automatically handles:

- Image optimization
- CDN and edge network
- Automatic HTTPS
- Server-side rendering and API routes
- Preview deployments for pull requests
