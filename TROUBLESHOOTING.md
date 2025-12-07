# GitHub Pages Troubleshooting

## Site URL

Your site should be available at: **https://joeycacciatore3.github.io/pixel-studio/**

## Common Issues

### 1. 404 Error / Site Not Found

**Check GitHub Pages Settings:**

1. Go to: https://github.com/JoeyCacciatore3/pixel-studio/settings/pages
2. Verify:
   - **Source**: **"GitHub Actions"** (NOT "Deploy from a branch")
   - Status should show "Your site is live at..."

**If not configured:**

- Set Source to **"GitHub Actions"**
- Click Save
- The workflow will automatically deploy

**Important**: This project uses the modern GitHub Actions deployment method, not the branch-based method. The source must be set to "GitHub Actions" for the workflow to work correctly.

### 2. Blank Page / Assets Not Loading

**Check:**

- Wait 5-10 minutes after deployment (GitHub Pages can take time to propagate)
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Check browser console for errors (F12)
- Verify `.nojekyll` file exists in the `public` directory (it should be included automatically in the build)

**The `.nojekyll` file:**

- Disables Jekyll processing so the `_next` folder is served correctly
- Should be automatically included in the build output
- If assets aren't loading, check that the build completed successfully

### 3. Deployment Not Running

**Check Actions:**

1. Go to: https://github.com/JoeyCacciatore3/pixel-studio/actions
2. Look for "Deploy Next.js site to Pages" workflow
3. If it failed, check the logs for errors

**Common build errors:**

- **Node version mismatch**: Workflow uses Node 20, ensure your local environment matches
- **Package manager issues**: Workflow auto-detects npm/yarn/pnpm
- **Build failures**: Check the "Build with Next.js" step logs

**Manually trigger:**

- Go to Actions tab
- Click "Deploy Next.js site to Pages"
- Click "Run workflow"
- Select branch: `master`

### 4. Workflow Fails with Permission Errors

**Check permissions:**

The workflow requires these permissions:

- `contents: read`
- `pages: write`
- `id-token: write`

These are set in the workflow file. If you see permission errors:

- Verify the workflow file has the correct permissions section
- Check that GitHub Actions is enabled in repository settings
- Ensure the repository has Pages enabled with source set to "GitHub Actions"

### 5. Repository Visibility

**Important:**

- Public repositories: GitHub Pages works automatically
- Private repositories: GitHub Pages requires a paid GitHub plan

If your repo is private, either:

- Make it public (Settings → Danger Zone → Change repository visibility)
- Or use a different hosting service (Vercel, Netlify)

### 6. Assets Load but App Doesn't Work

**Check:**

- Verify `basePath` is set correctly in `next.config.js` (should be `/pixel-studio`)
- Check that `GITHUB_PAGES=true` is set during build (workflow sets this automatically)
- Verify static export is enabled (`output: 'export'` in next.config.js when GITHUB_PAGES is true)
- Check browser console for JavaScript errors

### 7. Build Cache Issues

**If builds are slow or failing:**

The workflow includes Next.js build caching. If you suspect cache issues:

1. Go to Actions tab
2. Find a failed workflow run
3. Click on it
4. Check the "Restore cache" step
5. If needed, you can clear the cache by pushing a new commit

## Quick Verification Steps

1. ✅ Check Pages settings: https://github.com/JoeyCacciatore3/pixel-studio/settings/pages
   - Source should be: **"GitHub Actions"**
2. ✅ Check Actions: https://github.com/JoeyCacciatore3/pixel-studio/actions
   - Look for "Deploy Next.js site to Pages" workflow
   - Should show green checkmark for successful deployment
3. ✅ Wait 5-10 minutes after deployment
4. ✅ Try accessing: https://joeycacciatore3.github.io/pixel-studio/
5. ✅ Check browser console (F12) for any errors

## Workflow Details

The deployment workflow:

- **Name**: "Deploy Next.js site to Pages"
- **Triggers**: Push to `master` branch, or manual workflow_dispatch
- **Build job**: Runs on ubuntu-latest, builds Next.js with static export
- **Deploy job**: Uses `actions/deploy-pages@v4` to deploy to GitHub Pages
- **Caching**: Includes Next.js build cache for faster subsequent builds
- **Package manager**: Auto-detects npm/yarn/pnpm

## Still Not Working?

If the site still doesn't work after checking all the above:

1. Check the Actions workflow logs for specific errors
2. Verify the repository is public (if using free GitHub)
3. Try accessing the site in an incognito/private window
4. Check if there are any build errors in the workflow logs
5. Verify that the Pages source is set to "GitHub Actions" (not "Deploy from a branch")
6. Ensure the workflow file is in `.github/workflows/deploy-pages.yml`
