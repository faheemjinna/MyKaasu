# Money Manager App

A full-stack money management application with Splitwise integration, built with React + TypeScript (frontend) and FastAPI + Python (backend).

## Features

- User authentication (Signup/Login) with MongoDB
- Splitwise integration for importing expenses
- Expense tracking and display
- Modern, responsive UI

## Project Structure

```
MyMoney/
├── backend/          # FastAPI backend
│   ├── main.py      # Main application file
│   ├── requirements.txt
│   └── .env         # Environment variables
├── frontend/        # React + TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   └── App.tsx
│   └── package.json
└── README.md
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the backend directory with the following content:
```env
MONGODB_URI=mongodb+srv://faheem_db_user:8kBN5jQtUn1WwFRJ@mycluster.mfi1iyd.mongodb.net/agrocropai?retryWrites=true&w=majority
SECRET_KEY=your-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

**Note**: Make sure to change the `SECRET_KEY` to a secure random string in production.

5. Run the backend server:
```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`
API documentation at `http://localhost:8000/docs`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Usage

1. **Sign Up**: Create a new account with your email and password
2. **Login**: Use your credentials to log in
3. **Add Splitwise Credentials**: Click "Add Splitwise Credentials" and enter your API key and secret
4. **Import Expenses**: Click "Import Expenses" to fetch and display your Splitwise expenses

## Note on Splitwise Integration

The current implementation uses a simplified approach for Splitwise integration. For production use, you'll need to implement the full OAuth flow as required by Splitwise's API. The current version accepts API credentials and attempts to import expenses.

## Technologies Used

- **Backend**: FastAPI, Python, MongoDB (PyMongo), JWT authentication
- **Frontend**: React, TypeScript, Vite, React Router, Axios
- **Database**: MongoDB Atlas

