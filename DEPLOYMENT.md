# Deployment Guide

This project can be deployed to production using several methods. The recommended approach is **Vercel** for Next.js applications.

## Option 1: Vercel (Recommended - Easiest)

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

## Option 2: Netlify

1. Go to [netlify.com](https://netlify.com)
2. Sign in with GitHub
3. Click "Add new site" → "Import an existing project"
4. Select your repository
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
6. Click "Deploy site"

## Option 3: GitHub Actions + Vercel CLI

The repository includes a `vercel.json` configuration file. You can also deploy manually using:

```bash
npm install -g vercel
vercel
```

## Environment Variables

If you need environment variables:

1. In Vercel: Project Settings → Environment Variables
2. Add your variables
3. Redeploy

## Build Configuration

The project is configured with:

- **Framework**: Next.js 16
- **Node Version**: 20
- **Build Command**: `npm run build`
- **Install Command**: `npm ci`

All settings are in `vercel.json` and can be customized in the Vercel dashboard.
