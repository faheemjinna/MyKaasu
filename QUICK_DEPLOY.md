# Quick Deploy Instructions

## 🚀 Deploy to GitHub Pages in 3 Steps

### Step 1: Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `MyMoney` (or your preferred name)
3. Make it **Public** ✅
4. Click "Create repository"

### Step 2: Push Your Code
Run these commands (replace `YOUR_USERNAME` with your GitHub username):

```bash
cd /Users/faheemjinna/Desktop/MyMoney
git remote add origin https://github.com/YOUR_USERNAME/MyMoney.git
git push -u origin main
```

### Step 3: Enable GitHub Pages
1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**
4. Wait 2-3 minutes for deployment

## 🌐 Your Site URL
After deployment, your site will be live at:
```
https://YOUR_USERNAME.github.io/MyMoney/
```

## ⚠️ Important: Backend Setup
GitHub Pages only hosts the frontend. You need to deploy the backend separately:

**Recommended:** Use [Render.com](https://render.com) (free):
1. Sign up at render.com
2. New → Web Service
3. Connect your GitHub repo
4. Set build command: `pip install -r requirements.txt`
5. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Copy the URL and add it as `VITE_API_URL` secret in GitHub (Settings → Secrets → Actions)

See `DEPLOYMENT.md` for detailed instructions.
