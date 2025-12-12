# Deployment Guide for MyKaasu

This guide will help you deploy MyKaasu to GitHub Pages.

## Prerequisites

1. A GitHub account
2. Git installed on your computer
3. Node.js installed (for building)

## Step 1: Create a GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Name it `MyMoney` (or any name you prefer)
5. Make it **Public** (required for free GitHub Pages)
6. **Do NOT** initialize with README, .gitignore, or license
7. Click "Create repository"

## Step 2: Initialize Git and Push to GitHub

Run these commands in your terminal from the project root directory:

```bash
# Navigate to project directory
cd /Users/faheemjinna/Desktop/MyMoney

# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: MyKaasu Money Manager"

# Add your GitHub repository as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/MyMoney.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

## Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on **Settings** tab
3. Scroll down to **Pages** in the left sidebar
4. Under **Source**, select:
   - **Source**: `GitHub Actions`
5. The GitHub Actions workflow will automatically deploy your site

## Step 4: Configure Backend API URL (Important!)

Since GitHub Pages only hosts static files, you'll need to host your backend separately. Options:

### Option A: Use a Backend Hosting Service
- **Render.com** (Free tier available)
- **Railway.app** (Free tier available)
- **Fly.io** (Free tier available)
- **Heroku** (Paid)

### Option B: Update Environment Variable

Once your backend is hosted, update the GitHub Actions workflow to set the API URL:

1. Go to your repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `VITE_API_URL`
4. Value: Your backend URL (e.g., `https://your-backend.railway.app`)
5. Update `.github/workflows/deploy.yml` to use the secret:

```yaml
- name: Build
  working-directory: ./frontend
  run: npm run build
  env:
    NODE_ENV: production
    VITE_API_URL: ${{ secrets.VITE_API_URL }}
```

## Step 5: Access Your Deployed Site

After GitHub Actions completes (usually 2-3 minutes), your site will be available at:

```
https://YOUR_USERNAME.github.io/MyMoney/
```

## Troubleshooting

### Build fails
- Check GitHub Actions logs for errors
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### API not working
- Make sure your backend is deployed and accessible
- Check CORS settings on your backend
- Verify the `VITE_API_URL` environment variable is set correctly

### 404 errors on routes
- This is normal for React Router on GitHub Pages
- Users should navigate from the home page, or configure a redirect

## Updating Your Site

To update your deployed site:

```bash
git add .
git commit -m "Your update message"
git push origin main
```

GitHub Actions will automatically rebuild and redeploy your site.

## Backend Deployment (Separate)

Your backend needs to be deployed separately. Here's a quick guide for Render.com:

1. Go to [Render.com](https://render.com) and sign up
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Set:
   - **Name**: mykaasu-backend
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables if needed
6. Deploy!

Then update `VITE_API_URL` in GitHub Secrets with your Render URL.
