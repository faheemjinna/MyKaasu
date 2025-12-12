# Quick Start Guide

## Prerequisites

- Python 3.8+ installed
- Node.js 16+ and npm installed
- MongoDB Atlas account (already configured)

## Step-by-Step Setup

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (copy the MongoDB URI from the README)
# The .env file should contain:
# MONGODB_URI=mongodb+srv://faheem_db_user:8kBN5jQtUn1WwFRJ@mycluster.mfi1iyd.mongodb.net/agrocropai?retryWrites=true&w=majority
# SECRET_KEY=your-secret-key-change-this-in-production
# ALGORITHM=HS256
# ACCESS_TOKEN_EXPIRE_MINUTES=30

# Start the backend server
uvicorn main:app --reload
```

Backend will run on `http://localhost:8000`

### 2. Frontend Setup

Open a new terminal window:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

Frontend will run on `http://localhost:3000`

### 3. Using the App

1. Open `http://localhost:3000` in your browser
2. Click "Sign up" to create a new account
3. Enter your name, email, and password
4. After signing up, you'll be automatically logged in
5. On the dashboard, click "Add Splitwise Credentials"
6. Enter your Splitwise API credentials (see note below)
7. Click "Import Expenses" to fetch your expenses

## Getting Splitwise API Credentials

**Important**: Splitwise uses OAuth 1.0a for authentication. To get API credentials:

1. Go to https://secure.splitwise.com/apps
2. Register a new application
3. You'll receive a Consumer Key and Consumer Secret
4. For full OAuth flow, you'll need to implement the OAuth 1.0a flow

**Note**: The current implementation uses a simplified approach. For production, you'll need to implement the complete OAuth flow as required by Splitwise's API.

## Troubleshooting

### Backend Issues

- **MongoDB Connection Error**: Check that your MongoDB URI is correct in the `.env` file
- **Port Already in Use**: Change the port in `uvicorn main:app --reload --port 8001`

### Frontend Issues

- **Cannot connect to backend**: Make sure the backend is running on port 8000
- **CORS errors**: Check that the backend CORS settings include `http://localhost:3000`

## API Documentation

Once the backend is running, visit `http://localhost:8000/docs` for interactive API documentation.

