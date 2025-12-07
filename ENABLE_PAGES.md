# How to Enable GitHub Pages (Step-by-Step)

## The Problem

Your deployment workflow ran successfully, but GitHub Pages isn't enabled in your repository settings, so the site isn't being served.

## Solution: Enable GitHub Pages

### Step 1: Go to Repository Settings

1. Open: https://github.com/JoeyCacciatore3/pixel-studio
2. Click the **Settings** tab (top menu, next to Insights)

### Step 2: Navigate to Pages

1. In the left sidebar, scroll down and click **Pages**

### Step 3: Configure Pages

**Important**: This project uses the modern GitHub Actions deployment method.

1. Under **"Build and deployment"**:
   - **Source**: Select **"GitHub Actions"** (NOT "Deploy from a branch")
2. Click **Save**

**Note**: The workflow uses official GitHub Pages Actions (`actions/configure-pages@v4` and `actions/deploy-pages@v4`), which requires the source to be set to "GitHub Actions". This is the modern, recommended approach that provides better caching and build optimization.

### Step 4: Wait for Deployment

- After setting the source to "GitHub Actions", the workflow will automatically deploy
- GitHub will show: "Your site is live at https://joeycacciatore3.github.io/pixel-studio/"
- It may take 5-10 minutes to become accessible
- You'll see a green checkmark when it's ready

## Verify It's Working

### Check 1: Pages Settings

- Go to: https://github.com/JoeyCacciatore3/pixel-studio/settings/pages
- Should show: "Your site is live at..."
- Source should be: **"GitHub Actions"**

### Check 2: Visit the Site

- URL: https://joeycacciatore3.github.io/pixel-studio/
- Should load your Pixel Studio app (not a 404)

### Check 3: Check Actions

- Go to: https://github.com/JoeyCacciatore3/pixel-studio/actions
- Should see "Deploy Next.js site to Pages" workflow
- Should show successful deployment with green checkmark

## Troubleshooting

### If Pages option is missing:

- Your repository might be private
- Private repos need GitHub Pro/Team for Pages
- Solution: Make repo public OR use Vercel instead

### If it says "No deployments yet":

- The deployment workflow may not have run
- Check: https://github.com/JoeyCacciatore3/pixel-studio/actions
- Look for "Deploy Next.js site to Pages" workflow
- If it failed, check the logs for errors
- You can manually trigger it: Actions → "Deploy Next.js site to Pages" → "Run workflow"

### If site shows 404 after enabling:

- Wait 5-10 minutes (GitHub needs time to build and deploy)
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Check browser console for errors (F12)
- Verify the workflow completed successfully in the Actions tab

### If assets (CSS, JS) are not loading:

- The `.nojekyll` file should be in the `public` directory (it's included in the build)
- This file disables Jekyll processing so the `_next` folder is served correctly
- If missing, check that the build completed successfully

## Quick Status Check

Run this command to check if Pages is enabled:

```bash
curl -I https://joeycacciatore3.github.io/pixel-studio/
```

- **200 OK** = Site is live ✅
- **404 Not Found** = Pages not enabled or still building ❌
