# Splitwise Integration Guide

## Important: Splitwise Authentication

**You CANNOT use your Splitwise username/password directly.** Splitwise uses OAuth 1.0a authentication, which requires API credentials obtained by registering your application.

## How to Get Splitwise API Credentials

### Step 1: Register Your Application

1. Go to **https://secure.splitwise.com/apps**
2. Log in with your Splitwise account
3. Click **"Register a new application"**
4. Fill in the required information:
   - **Application Name**: e.g., "My Money Manager"
   - **Description**: Brief description of your app
   - **Homepage URL**: Your app's URL (can be `http://localhost:3000` for development)
   - **Callback URL**: `http://localhost:3000/dashboard` (for OAuth callback)
5. Accept the terms of service
6. Click **"Register and get API key"**

### Step 2: Get Your Credentials

After registration, you'll receive:

- **Consumer Key** (also called API Key)
- **Consumer Secret** (also called API Secret)

These are displayed on your application's detail page.

### Step 3: For Testing (Optional)

Splitwise also provides a **Personal API Key** for testing purposes that allows you to make API calls without going through the full OAuth flow. You can find this on your project's detail page.

## Using the Credentials in the App

1. Log in to your Money Manager app
2. Go to the Dashboard
3. Click **"Add Splitwise Credentials"**
4. Enter:
   - **Consumer Key / API Key**: Your Consumer Key or Personal API Key
   - **Consumer Secret**: Your Consumer Secret
5. Click **"Save Credentials"**
6. Click **"Import Expenses"** to fetch your Splitwise expenses

## Important Notes

- **OAuth Flow**: The current implementation uses a simplified approach. For production, you should implement the full OAuth 1.0a flow where users authorize your app through Splitwise's website.
- **API Key vs OAuth**: Using a Personal API Key is easier for testing but has limitations. For production apps, implement the full OAuth flow.
- **Security**: Never share your Consumer Secret publicly. Keep it secure.

## Troubleshooting

- **"API authentication failed"**: Check that your Consumer Key and Secret are correct
- **"No expenses found"**: Make sure you have expenses in your Splitwise account
- **CORS errors**: The backend needs to handle OAuth callbacks properly

## Resources

- Splitwise API Documentation: https://dev.splitwise.com/
- Register Application: https://secure.splitwise.com/apps
- OAuth 1.0a Guide: https://dev.splitwise.com/#section/Authentication

