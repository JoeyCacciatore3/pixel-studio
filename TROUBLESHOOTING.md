# GitHub Pages Troubleshooting

## Site URL

Your site should be available at: **https://joeycacciatore3.github.io/pixel-studio/**

## Common Issues

### 1. 404 Error / Site Not Found

**Check GitHub Pages Settings:**

1. Go to: https://github.com/JoeyCacciatore3/pixel-studio/settings/pages
2. Verify:
   - **Source**: "Deploy from a branch"
   - **Branch**: `gh-pages` / `/ (root)`
   - Status should show "Your site is live at..."

**If not configured:**

- Set Source to "Deploy from a branch"
- Select branch: `gh-pages`
- Click Save

### 2. Blank Page / Assets Not Loading

**Check:**

- Wait 5-10 minutes after deployment (GitHub Pages can take time to propagate)
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Check browser console for errors (F12)

### 3. Deployment Not Running

**Check Actions:**

1. Go to: https://github.com/JoeyCacciatore3/pixel-studio/actions
2. Look for "Deploy to GitHub Pages" workflow
3. If it failed, check the logs for errors

**Manually trigger:**

- Go to Actions tab
- Click "Deploy to GitHub Pages"
- Click "Run workflow"

### 4. Verify gh-pages Branch Exists

**Check:**

- Go to: https://github.com/JoeyCacciatore3/pixel-studio/branches
- You should see a `gh-pages` branch
- If missing, the workflow may have failed

### 5. Repository Visibility

**Important:**

- Public repositories: GitHub Pages works automatically
- Private repositories: GitHub Pages requires a paid GitHub plan

If your repo is private, either:

- Make it public (Settings → Danger Zone → Change repository visibility)
- Or use a different hosting service (Vercel, Netlify)

## Quick Verification Steps

1. ✅ Check Pages settings: https://github.com/JoeyCacciatore3/pixel-studio/settings/pages
2. ✅ Check Actions: https://github.com/JoeyCacciatore3/pixel-studio/actions
3. ✅ Check gh-pages branch: https://github.com/JoeyCacciatore3/pixel-studio/tree/gh-pages
4. ✅ Wait 5-10 minutes after deployment
5. ✅ Try accessing: https://joeycacciatore3.github.io/pixel-studio/

## Still Not Working?

If the site still doesn't work after checking all the above:

1. Check the Actions workflow logs for specific errors
2. Verify the repository is public (if using free GitHub)
3. Try accessing the site in an incognito/private window
4. Check if there are any build errors in the workflow logs
