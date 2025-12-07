# Quick Start: Enable GitHub Pages

## ⚠️ Required Before First Deployment

**You must enable GitHub Pages in your repository settings before the workflow can run.**

## Step-by-Step Instructions

### 1. Go to Repository Settings

Open: **https://github.com/JoeyCacciatore3/pixel-studio/settings/pages**

### 2. Enable GitHub Pages

1. Scroll down to the **"Pages"** section in the left sidebar
2. Under **"Build and deployment"**:
   - **Source**: Select **"GitHub Actions"** (NOT "Deploy from a branch")
3. Click **"Save"**

### 3. Verify

After saving, you should see:

- ✅ "Your site is live at https://joeycacciatore3.github.io/pixel-studio/"
- ✅ Source shows: "GitHub Actions"

### 4. Trigger Deployment

The workflow will automatically run on the next push, or you can:

1. Go to **Actions** tab
2. Select **"Deploy Next.js site to Pages"**
3. Click **"Run workflow"**
4. Select branch: `master`
5. Click **"Run workflow"**

## Common Error

If you see this error in the workflow:

```
Error: Get Pages site failed. Please verify that the repository has Pages enabled
and configured to build using GitHub Actions
```

**Solution**: Follow steps 1-3 above to enable Pages with "GitHub Actions" as the source.

## After Enabling

- ✅ Workflow will run automatically on pushes to `master`
- ✅ Site will be live at: `https://joeycacciatore3.github.io/pixel-studio/`
- ✅ Deployment takes 5-10 minutes after workflow completes

## Need Help?

See `ENABLE_PAGES.md` for detailed troubleshooting.
