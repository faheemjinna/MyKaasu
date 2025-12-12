from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
from passlib.context import CryptContext
import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel, EmailStr, ValidationError
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Money Manager API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Exception handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=400,
        content={"detail": exc.errors()},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

# Global exception handler to ensure CORS headers on errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

# MongoDB connection
MONGODB_URI = os.getenv("MONGODB_URI")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

client = MongoClient(MONGODB_URI)
db = client.get_database()
users_collection = db.users
expenses_collection = db.expenses
groups_collection = db.groups
income_collection = db.income

# Password hashing - using bcrypt directly to avoid passlib issues
def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str

class Token(BaseModel):
    access_token: str
    token_type: str

class SplitwiseCredentials(BaseModel):
    api_key: str  # Personal API Key (Bearer token) from Splitwise - use this for testing
    api_secret: Optional[str] = None  # Consumer Secret (optional, needed for OAuth flow)

class ImportDateRange(BaseModel):
    start_date: Optional[str] = None  # ISO format date string
    end_date: Optional[str] = None   # ISO format date string

class Expense(BaseModel):
    id: Optional[str] = None
    description: str
    amount: float
    currency: str
    date: str
    category: Optional[str] = None
    splitwise_id: Optional[str] = None

# Helper functions are now defined above

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = users_collection.find_one({"email": email})
    if user is None:
        raise credentials_exception
    
    # Ensure _id is accessible
    if "_id" not in user:
        raise credentials_exception
    
    return user

# Routes
@app.get("/")
async def root():
    return {"message": "Money Manager API"}

@app.post("/signup", response_model=UserResponse)
async def signup(user_data: UserCreate):
    # Check if user already exists
    if users_collection.find_one({"email": user_data.email}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user_doc = {
        "email": user_data.email,
        "name": user_data.name,
        "hashed_password": hashed_password,
        "splitwise_api_key": None,
        "splitwise_api_secret": None,
        "created_at": datetime.utcnow().isoformat()
    }
    
    try:
        result = users_collection.insert_one(user_doc)
        user_doc["id"] = str(result.inserted_id)
        return UserResponse(
            id=str(result.inserted_id),
            email=user_doc["email"],
            name=user_doc["name"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}"
        )

@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = users_collection.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/me", response_model=UserResponse)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user["_id"]),
        email=current_user["email"],
        name=current_user["name"]
    )

@app.post("/splitwise/credentials")
async def save_splitwise_credentials(
    credentials: SplitwiseCredentials,
    current_user: dict = Depends(get_current_user)
):
    update_data = {
        "splitwise_api_key": credentials.api_key
    }
    if credentials.api_secret:
        update_data["splitwise_api_secret"] = credentials.api_secret
    
    users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": update_data}
    )
    return {"message": "Splitwise API key saved successfully"}

@app.post("/splitwise/import")
async def import_splitwise_expenses(
    date_range: Optional[ImportDateRange] = None,
    update_existing: bool = False,  # If True, only update existing expenses
    current_user: dict = Depends(get_current_user)
):
    api_key = current_user.get("splitwise_api_key")
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Splitwise API key not found. Please add your API key first."
        )
    
    # Import expenses from Splitwise using Personal API Key (Bearer token)
    try:
        import requests
        
        headers = {
            "Authorization": f"Bearer {api_key}"
        }
        
        # First, get current user's Splitwise ID
        current_user_url = "https://secure.splitwise.com/api/v3.0/get_current_user"
        user_response = requests.get(current_user_url, headers=headers)
        
        if user_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get Splitwise user information."
            )
        
        user_data = user_response.json()
        splitwise_user_id = user_data.get("user", {}).get("id")
        
        if not splitwise_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not determine your Splitwise user ID."
            )
        
        # Fetch all expenses by paginating through all pages
        base_url = "https://secure.splitwise.com/api/v3.0/get_expenses"
        all_expenses = []
        limit = 100  # Maximum per page
        offset = 0
        has_more = True
        
        while has_more:
            params = {
                "limit": limit,
                "offset": offset
            }
            
            response = requests.get(base_url, headers=headers, params=params)
            
            if response.status_code == 401:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid API key. Please check your Splitwise API key."
                )
            elif response.status_code != 200:
                error_detail = f"Splitwise API error: {response.status_code}"
                try:
                    error_data = response.json()
                    error_detail = error_data.get("error", {}).get("message", error_detail)
                except:
                    error_detail = f"Splitwise API error: {response.status_code} - {response.text[:200]}"
                
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=error_detail
                )
            
            data = response.json()
            page_expenses = data.get("expenses", [])
            
            if not page_expenses or len(page_expenses) == 0:
                has_more = False
            else:
                all_expenses.extend(page_expenses)
                # If we got fewer than the limit, we've reached the end
                if len(page_expenses) < limit:
                    has_more = False
                else:
                    offset += limit
        
        expenses_data = all_expenses
        
        if not expenses_data:
            return {
                "message": "No expenses found in your Splitwise account.",
                "count": 0,
                "skipped": 0,
                "skipped_expenses": []
            }
        
        # Filter by date range if provided
        if date_range and (date_range.start_date or date_range.end_date):
            filtered_expenses = []
            start_date_obj = None
            end_date_obj = None
            
            if date_range.start_date:
                try:
                    # Parse date string (YYYY-MM-DD format from date input)
                    # Set to start of day (00:00:00) - only include expenses on or after this date
                    start_date_obj = datetime.strptime(date_range.start_date, '%Y-%m-%d')
                    start_date_obj = start_date_obj.replace(hour=0, minute=0, second=0, microsecond=0)
                    # Keep it as naive datetime (local date, no timezone)
                except Exception as e:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid start date format: {str(e)}"
                    )
            
            if date_range.end_date:
                try:
                    # Parse date string (YYYY-MM-DD format from date input)
                    # Set to end of day (23:59:59) - only include expenses on or before this date
                    end_date_obj = datetime.strptime(date_range.end_date, '%Y-%m-%d')
                    end_date_obj = end_date_obj.replace(hour=23, minute=59, second=59, microsecond=999999)
                    # Keep it as naive datetime (local date, no timezone)
                except Exception as e:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid end date format: {str(e)}"
                    )
            
            for expense_data in expenses_data:
                expense_date_str = expense_data.get("date", "")
                if not expense_date_str:
                    continue
                
                try:
                    # Parse expense date and normalize to timezone-naive
                    expense_date = datetime.fromisoformat(expense_date_str.replace('Z', '+00:00'))
                    # Convert to naive datetime if timezone-aware
                    if expense_date.tzinfo is not None:
                        expense_date = expense_date.replace(tzinfo=None)
                except:
                    try:
                        expense_date = datetime.fromisoformat(expense_date_str)
                        if expense_date.tzinfo is not None:
                            expense_date = expense_date.replace(tzinfo=None)
                    except:
                        # Try parsing as date string
                        try:
                            expense_date = datetime.strptime(expense_date_str[:10], '%Y-%m-%d')
                        except:
                            continue
                
                # Check if expense is within date range (all dates are now timezone-naive)
                # Only include expenses on or after start_date (00:00:00), and on or before end_date (23:59:59)
                if start_date_obj and expense_date < start_date_obj:
                    continue
                if end_date_obj and expense_date > end_date_obj:
                    continue
                
                filtered_expenses.append(expense_data)
            
            expenses_data = filtered_expenses
        
        if not expenses_data:
            date_msg = ""
            if date_range and (date_range.start_date or date_range.end_date):
                date_msg = " in the selected date range"
            return {
                "message": f"No expenses found{date_msg}.",
                "count": 0,
                "skipped": 0,
                "skipped_expenses": []
            }
        
        imported_expenses = []  # List of expenses to return (NOT saved to database)
        skipped_count = 0
        skipped_expenses = []  # Track skipped expenses for display
        
        for expense_data in expenses_data:
            try:
                # Find user's share in this expense
                users = expense_data.get("users", [])
                user_share_info = None
                
                for user_info in users:
                    if user_info.get("user", {}).get("id") == splitwise_user_id:
                        user_share_info = user_info
                        break
                
                # Skip if user is not part of this expense
                if not user_share_info:
                    skipped_count += 1
                    continue
                
                # Get user's owed share (what they owe)
                owed_share = user_share_info.get("owed_share", "0")
                if isinstance(owed_share, str):
                    owed_share = owed_share.replace(",", "")
                owed_amount = float(owed_share)
                
                # Get user's paid share (what they paid)
                paid_share = user_share_info.get("paid_share", "0")
                if isinstance(paid_share, str):
                    paid_share = paid_share.replace(",", "")
                paid_amount = float(paid_share)
                
                # Calculate net balance: positive = others owe you (lent), negative = you owe (borrowed)
                net_balance = paid_amount - owed_amount
                
                # Get total expense cost
                total_cost = expense_data.get("cost", "0")
                if isinstance(total_cost, str):
                    total_cost = total_cost.replace(",", "")
                total_expense_amount = float(total_cost)
                
                # Skip if you have no share and didn't pay (someone else paid everything)
                if owed_amount == 0 and paid_amount == 0:
                    skipped_count += 1
                    skipped_expenses.append({
                        "description": expense_data.get("description", "Unknown expense"),
                        "date": expense_data.get("date", ""),
                        "reason": "No share in expense"
                    })
                    continue
                
                # Skip if net_balance == 0 and you didn't pay (someone else paid for you)
                if net_balance == 0 and paid_amount == 0:
                    skipped_count += 1
                    skipped_expenses.append({
                        "description": expense_data.get("description", "Unknown expense"),
                        "date": expense_data.get("date", ""),
                        "reason": "Someone else paid"
                    })
                    continue
                
                # Determine expense type and amount
                if net_balance > 0:
                    # You lent money
                    expense_type = "lent"
                    # If your share is 0, you lent the full amount you paid
                    # Otherwise, you lent: total - your share
                    if owed_amount == 0:
                        display_amount = paid_amount  # You paid full amount, your share is 0
                    else:
                        display_amount = total_expense_amount - owed_amount  # Total - your share
                    expense_title = "You Lent"
                elif net_balance < 0:
                    # You borrowed - show what you owe
                    expense_type = "borrowed"
                    display_amount = abs(net_balance)
                    expense_title = "You Owe"
                elif paid_amount > 0:
                    # You paid your share exactly
                    expense_type = "you_paid"
                    display_amount = paid_amount
                    expense_title = "You Paid"
                else:
                    # Shouldn't reach here, but handle it
                    expense_type = "balanced"
                    display_amount = owed_amount
                    expense_title = "Balanced"
                
                # Get description
                description = expense_data.get("description", "Unknown expense")
                
                # Skip expenses named "Payment" (check description/name)
                description_normalized = str(description).strip().lower()
                if description_normalized == "payment":
                    skipped_count += 1
                    skipped_expenses.append({
                        "description": expense_data.get("description", "Unknown expense"),
                        "date": expense_data.get("date", ""),
                        "reason": "Expense name is 'Payment'"
                    })
                    continue
                
                # Get currency
                currency = expense_data.get("currency_code", "USD")
                
                # Get date
                date_str = expense_data.get("date", datetime.utcnow().isoformat())
                
                # Get category
                category = "Uncategorized"
                category_obj = expense_data.get("category")
                if category_obj:
                    if isinstance(category_obj, dict):
                        category = category_obj.get("name", "Uncategorized")
                    elif isinstance(category_obj, str):
                        category = category_obj
                
                # Get expense ID
                expense_id = str(expense_data.get("id", ""))
                
                # Create expense object to return (NOT saved to database)
                expense_obj = {
                    "id": expense_id,  # Use splitwise_id as id for frontend
                    "splitwise_id": expense_id,
                    "description": description,
                    "amount": display_amount,
                    "currency": currency,
                    "date": date_str,
                    "category": category,
                    "expense_type": expense_type,  # "lent", "borrowed", "you_paid"
                    "expense_title": expense_title,  # "You Lent", "You Owe", "You Paid"
                    "net_balance": net_balance,
                    "owed_share": owed_amount,
                    "paid_share": paid_amount,
                    "total_expense": total_expense_amount
                }
                
                # Check if expense already exists in database
                existing_expense = expenses_collection.find_one({
                    "splitwise_id": expense_id, 
                    "user_id": str(current_user["_id"])
                })
                
                if existing_expense:
                    # Mark as already imported, but still return it
                    expense_obj["already_imported"] = True
                    skipped_count += 1
                else:
                    expense_obj["already_imported"] = False
                
                # Add to list (NOT saving to database)
                imported_expenses.append(expense_obj)
                    
            except Exception as e:
                # Skip expenses that can't be parsed
                skipped_count += 1
                skipped_expenses.append({
                    "description": expense_data.get("description", "Unknown expense"),
                    "date": expense_data.get("date", ""),
                    "reason": f"Parse error: {str(e)[:50]}"
                })
                continue
        
        return {
            "message": f"Found {len(imported_expenses)} expenses. {skipped_count} expenses skipped (duplicates or invalid).",
            "expenses": imported_expenses,  # Return expenses for user to select (NOT saved yet)
            "count": len(imported_expenses),
            "skipped": skipped_count,
            "total_fetched": len(expenses_data),
            "skipped_expenses": skipped_expenses[:50]  # Limit to first 50 for response size
        }
        
    except HTTPException:
        raise
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to connect to Splitwise API: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error importing expenses: {str(e)}"
        )

@app.get("/expenses")
async def get_expenses(
    page: int = 1,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    try:
        user_id = str(current_user.get("_id", ""))
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found"
            )
        
        skip = (page - 1) * limit
        
        # Get total count
        total_count = expenses_collection.count_documents({"user_id": user_id})
        
        # Get paginated expenses, sorted by date descending
        expenses_cursor = expenses_collection.find({"user_id": user_id}).sort("date", -1).skip(skip).limit(limit)
        expenses = []
        for expense in expenses_cursor:
            # Convert ObjectId to string for id field
            expense_dict = dict(expense)
            expense_dict["id"] = str(expense["_id"])
            # Remove _id from response to avoid serialization issues
            if "_id" in expense_dict:
                del expense_dict["_id"]
            expenses.append(expense_dict)
        
        return {
            "expenses": expenses,
            "total": total_count,
            "page": page,
            "limit": limit,
            "total_pages": (total_count + limit - 1) // limit
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching expenses: {str(e)}"
        )

@app.post("/expenses")
async def create_expense(expense_data: dict, current_user: dict = Depends(get_current_user)):
    try:
        user_id = str(current_user.get("_id", ""))
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found"
            )
        
        expense_doc = {
            "user_id": user_id,
            "description": expense_data.get("description", ""),
            "amount": float(expense_data.get("amount", 0)),
            "currency": expense_data.get("currency", "USD"),
            "date": expense_data.get("date", datetime.utcnow().isoformat()),
            "category": expense_data.get("category", ""),
            "group_id": expense_data.get("group_id", ""),
            "group_name": expense_data.get("group_name", ""),
            "expense_type": expense_data.get("expense_type", "manual"),
            "total_expense": float(expense_data.get("total_expense", expense_data.get("amount", 0))),
            "owed_share": float(expense_data.get("owed_share", expense_data.get("amount", 0))),
            "paid_share": float(expense_data.get("paid_share", 0)),
            "splitwise_id": expense_data.get("splitwise_id", ""),  # Preserve splitwise_id if provided
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = expenses_collection.insert_one(expense_doc)
        expense_doc["id"] = str(result.inserted_id)
        if "_id" in expense_doc:
            del expense_doc["_id"]
        
        return expense_doc
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating expense: {str(e)}"
        )

@app.put("/expenses/{expense_id}")
async def update_expense(expense_id: str, expense_data: dict, current_user: dict = Depends(get_current_user)):
    try:
        from bson import ObjectId
        user_id = str(current_user.get("_id", ""))
        
        update_doc = {
            "description": expense_data.get("description"),
            "amount": expense_data.get("amount"),
            "currency": expense_data.get("currency"),
            "date": expense_data.get("date"),
            "category": expense_data.get("category"),
            "group_id": expense_data.get("group_id"),
            "group_name": expense_data.get("group_name"),
            "total_expense": expense_data.get("total_expense"),
            "owed_share": expense_data.get("owed_share"),
            "paid_share": expense_data.get("paid_share"),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Remove None values
        update_doc = {k: v for k, v in update_doc.items() if v is not None}
        
        # Try to update by ObjectId
        try:
            result = expenses_collection.update_one(
                {"_id": ObjectId(expense_id), "user_id": user_id},
                {"$set": update_doc}
            )
            if result.modified_count > 0:
                updated = expenses_collection.find_one({"_id": ObjectId(expense_id)})
                updated["id"] = str(updated["_id"])
                del updated["_id"]
                return updated
        except:
            pass
        
        # Try to find by string ID
        expenses = list(expenses_collection.find({"user_id": user_id}))
        for expense in expenses:
            if str(expense["_id"]) == expense_id:
                result = expenses_collection.update_one(
                    {"_id": expense["_id"], "user_id": user_id},
                    {"$set": update_doc}
                )
                updated = expenses_collection.find_one({"_id": expense["_id"]})
                updated["id"] = str(updated["_id"])
                del updated["_id"]
                return updated
        
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating expense: {str(e)}"
        )

@app.delete("/expenses")
async def clear_expenses(current_user: dict = Depends(get_current_user)):
    result = expenses_collection.delete_many({"user_id": str(current_user["_id"])})
    return {
        "message": f"Successfully deleted {result.deleted_count} expenses",
        "deleted_count": result.deleted_count
    }

@app.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, current_user: dict = Depends(get_current_user)):
    from bson import ObjectId
    
    # Try to delete by ObjectId first (if expense_id is a valid ObjectId string)
    try:
        result = expenses_collection.delete_one({
            "_id": ObjectId(expense_id),
            "user_id": str(current_user["_id"])
        })
        if result.deleted_count > 0:
            return {
                "message": "Expense deleted successfully",
                "deleted_count": result.deleted_count
            }
    except Exception:
        pass
    
    # If ObjectId deletion failed, find expense by splitwise_id or other identifier
    # The frontend sends the "id" which is the string version of _id
    # So we need to find by matching the string representation
    expenses = list(expenses_collection.find({"user_id": str(current_user["_id"])}))
    for expense in expenses:
        if str(expense["_id"]) == expense_id:
            result = expenses_collection.delete_one({
                "_id": expense["_id"],
                "user_id": str(current_user["_id"])
            })
            return {
                "message": "Expense deleted successfully",
                "deleted_count": result.deleted_count
            }
    
    # If still not found, try by splitwise_id
    result = expenses_collection.delete_one({
        "splitwise_id": expense_id,
        "user_id": str(current_user["_id"])
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    return {
        "message": "Expense deleted successfully",
        "deleted_count": result.deleted_count
    }

# Groups endpoints
@app.get("/groups")
async def get_groups(current_user: dict = Depends(get_current_user)):
    try:
        user_id = str(current_user.get("_id", ""))
        groups = list(groups_collection.find({"user_id": user_id}))
        for group in groups:
            group["id"] = str(group["_id"])
            # Count expenses in this group
            expense_count = expenses_collection.count_documents({"user_id": user_id, "group_id": group["id"]})
            group["expense_count"] = expense_count
            if "_id" in group:
                del group["_id"]
        return {"groups": groups}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching groups: {str(e)}"
        )

@app.post("/groups")
async def create_group(group_data: dict, current_user: dict = Depends(get_current_user)):
    try:
        user_id = str(current_user.get("_id", ""))
        group_doc = {
            "user_id": user_id,
            "name": group_data.get("name", ""),
            "description": group_data.get("description", ""),
            "color": group_data.get("color", "#10b981"),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = groups_collection.insert_one(group_doc)
        group_doc["id"] = str(result.inserted_id)
        group_doc["expense_count"] = 0
        if "_id" in group_doc:
            del group_doc["_id"]
        
        return group_doc
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating group: {str(e)}"
        )

@app.put("/groups/{group_id}")
async def update_group(group_id: str, group_data: dict, current_user: dict = Depends(get_current_user)):
    try:
        from bson import ObjectId
        user_id = str(current_user.get("_id", ""))
        
        update_doc = {
            "name": group_data.get("name"),
            "description": group_data.get("description"),
            "color": group_data.get("color"),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        update_doc = {k: v for k, v in update_doc.items() if v is not None}
        
        result = groups_collection.update_one(
            {"_id": ObjectId(group_id), "user_id": user_id},
            {"$set": update_doc}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )
        
        updated = groups_collection.find_one({"_id": ObjectId(group_id)})
        updated["id"] = str(updated["_id"])
        expense_count = expenses_collection.count_documents({"user_id": user_id, "group_id": updated["id"]})
        updated["expense_count"] = expense_count
        del updated["_id"]
        return updated
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating group: {str(e)}"
        )

@app.delete("/groups/{group_id}")
async def delete_group(group_id: str, current_user: dict = Depends(get_current_user)):
    try:
        from bson import ObjectId
        user_id = str(current_user.get("_id", ""))
        
        result = groups_collection.delete_one({
            "_id": ObjectId(group_id),
            "user_id": user_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found"
            )
        
        # Remove group_id from expenses in this group
        expenses_collection.update_many(
            {"user_id": user_id, "group_id": group_id},
            {"$unset": {"group_id": "", "group_name": ""}}
        )
        
        return {
            "message": "Group deleted successfully",
            "deleted_count": result.deleted_count
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting group: {str(e)}"
        )

# Income endpoints
@app.get("/income")
async def get_income(current_user: dict = Depends(get_current_user)):
    try:
        user_id = str(current_user.get("_id", ""))
        income = list(income_collection.find({"user_id": user_id}))
        for item in income:
            item["id"] = str(item["_id"])
            if "_id" in item:
                del item["_id"]
        return {"income": income}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching income: {str(e)}"
        )

@app.post("/income")
async def create_income(income_data: dict, current_user: dict = Depends(get_current_user)):
    try:
        user_id = str(current_user.get("_id", ""))
        income_doc = {
            "user_id": user_id,
            "description": income_data.get("description", ""),
            "amount": float(income_data.get("amount", 0)),
            "currency": income_data.get("currency", "USD"),
            "date": income_data.get("date", datetime.utcnow().isoformat()),
            "category": income_data.get("category", ""),
            "source": income_data.get("source", ""),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = income_collection.insert_one(income_doc)
        income_doc["id"] = str(result.inserted_id)
        if "_id" in income_doc:
            del income_doc["_id"]
        
        return income_doc
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating income: {str(e)}"
        )

@app.put("/income/{income_id}")
async def update_income(income_id: str, income_data: dict, current_user: dict = Depends(get_current_user)):
    try:
        from bson import ObjectId
        user_id = str(current_user.get("_id", ""))
        
        update_doc = {
            "description": income_data.get("description"),
            "amount": income_data.get("amount"),
            "currency": income_data.get("currency"),
            "date": income_data.get("date"),
            "category": income_data.get("category"),
            "source": income_data.get("source"),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        update_doc = {k: v for k, v in update_doc.items() if v is not None}
        
        try:
            result = income_collection.update_one(
                {"_id": ObjectId(income_id), "user_id": user_id},
                {"$set": update_doc}
            )
            if result.modified_count > 0:
                updated = income_collection.find_one({"_id": ObjectId(income_id)})
                updated["id"] = str(updated["_id"])
                del updated["_id"]
                return updated
        except:
            pass
        
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Income not found"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating income: {str(e)}"
        )

@app.delete("/income/{income_id}")
async def delete_income(income_id: str, current_user: dict = Depends(get_current_user)):
    try:
        from bson import ObjectId
        user_id = str(current_user.get("_id", ""))
        
        result = income_collection.delete_one({
            "_id": ObjectId(income_id),
            "user_id": user_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Income not found"
            )
        
        return {
            "message": "Income deleted successfully",
            "deleted_count": result.deleted_count
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting income: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

