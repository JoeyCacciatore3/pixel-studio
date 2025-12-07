# How to Enable GitHub Pages (Step-by-Step)

## The Problem

Your deployment workflow ran successfully and created the `gh-pages` branch, but GitHub Pages isn't enabled in your repository settings, so the site isn't being served.

## Solution: Enable GitHub Pages

### Step 1: Go to Repository Settings

1. Open: https://github.com/JoeyCacciatore3/pixel-studio
2. Click the **Settings** tab (top menu, next to Insights)

### Step 2: Navigate to Pages

1. In the left sidebar, scroll down and click **Pages**

### Step 3: Configure Pages

1. Under **"Build and deployment"**:
   - **Source**: Select **"Deploy from a branch"**
   - **Branch**: Select **`gh-pages`** from the dropdown
   - **Folder**: Select **`/ (root)`**
2. Click **Save**

### Step 4: Wait for Deployment

- GitHub will show: "Your site is live at https://joeycacciatore3.github.io/pixel-studio/"
- It may take 5-10 minutes to become accessible
- You'll see a green checkmark when it's ready

## Verify It's Working

### Check 1: Pages Settings

- Go to: https://github.com/JoeyCacciatore3/pixel-studio/settings/pages
- Should show: "Your site is live at..."

### Check 2: Visit the Site

- URL: https://joeycacciatore3.github.io/pixel-studio/
- Should load your Pixel Studio app (not a 404)

### Check 3: Check gh-pages Branch

- Go to: https://github.com/JoeyCacciatore3/pixel-studio/tree/gh-pages
- Should see your built files (index.html, \_next folder, etc.)

## Troubleshooting

### If Pages option is missing:

- Your repository might be private
- Private repos need GitHub Pro/Team for Pages
- Solution: Make repo public OR use Vercel instead

### If it says "gh-pages branch not found":

- The deployment workflow may have failed
- Check: https://github.com/JoeyCacciatore3/pixel-studio/actions
- Look for "Deploy to GitHub Pages" workflow errors

### If site shows 404 after enabling:

- Wait 5-10 minutes (GitHub needs time to build)
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Check browser console for errors (F12)

## Quick Status Check

Run this command to check if Pages is enabled:

```bash
curl -I https://joeycacciatore3.github.io/pixel-studio/
```

- **200 OK** = Site is live ✅
- **404 Not Found** = Pages not enabled or still building ❌
