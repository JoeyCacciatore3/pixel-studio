# Deployment Guide

This project can be deployed to production using several methods. The recommended approach is **GitHub Pages** (free, automatic) or **Vercel** for Next.js applications.

## Option 1: GitHub Pages (Recommended - Free & Automatic)

Your site will be automatically deployed to GitHub Pages whenever you push to the `master` branch using GitHub Actions.

### Setup (One-time)

1. Go to your repository: `https://github.com/JoeyCacciatore3/pixel-studio`
2. Click **Settings** → **Pages**
3. Under **Build and deployment**, select:
   - **Source**: **GitHub Actions** (this is the modern approach)
4. Click **Save**

**Important**: The workflow uses the official GitHub Pages Actions (`actions/configure-pages@v4` and `actions/deploy-pages@v4`), which requires the source to be set to "GitHub Actions" instead of "Deploy from a branch".

### Your Site URL

After the first deployment, your site will be available at:

- `https://joeycacciatore3.github.io/pixel-studio/`

### Automatic Deployments

- Every push to `master` branch = Automatic deployment
- Deployments happen via GitHub Actions
- Build logs available in the **Actions** tab
- Uses modern GitHub Pages Actions with better caching and optimization

### Manual Deployment

You can also trigger a deployment manually:

1. Go to **Actions** tab in your repository
2. Select "Deploy Next.js site to Pages" workflow
3. Click "Run workflow"

### Technical Details

The deployment workflow:

- Uses official GitHub Pages Actions (`actions/configure-pages@v4`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`)
- Automatically detects package manager (npm, yarn, pnpm)
- Caches Next.js build artifacts for faster builds
- Includes `.nojekyll` file to ensure `_next` folder is served correctly
- Builds with `GITHUB_PAGES=true` environment variable to enable static export

## Option 2: Vercel (Recommended - Easiest)

Vercel is made by the Next.js team and provides the best experience for Next.js apps.

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

### Custom Domain

1. Go to your project settings in Vercel
2. Click "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

## Option 3: Netlify

1. Go to [netlify.com](https://netlify.com)
2. Sign in with GitHub
3. Click "Add new site" → "Import an existing project"
4. Select your repository
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
6. Click "Deploy site"

## Environment Variables

If you need environment variables:

1. In Vercel: Project Settings → Environment Variables
2. Add your variables
3. Redeploy

## Build Configuration

The project is configured with:

- **Framework**: Next.js 16
- **Node Version**: 20
- **Build Command**: `npm run build` (or `npm run build:gh-pages` for GitHub Pages)
- **Install Command**: `npm ci`

All settings are in `vercel.json` and can be customized in the Vercel dashboard.
