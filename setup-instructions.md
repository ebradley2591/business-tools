# Firebase Setup Instructions

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: "smart-customer-directory"
4. Enable Google Analytics (optional)
5. Click "Create project"

## 2. Enable Authentication

1. In Firebase project, click "Authentication" in left sidebar
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Click "Email/Password"
5. Enable "Email/Password" authentication
6. Click "Save"

## 3. Create Firestore Database

1. Click "Firestore Database" in left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select location closest to your users
5. Click "Done"

## 4. Get Firebase Configuration

1. Click gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll to "Your apps" section
4. Click web icon (</>)
5. Register app with nickname: "smart-customer-directory-web"
6. Copy the Firebase config object

## 5. Get Service Account Key

1. In Project settings, go to "Service accounts" tab
2. Click "Generate new private key"
3. Click "Generate key"
4. Download the JSON file

## 6. Set Up Environment Variables

Create `.env.local` file in project root with:

```bash
# Firebase Configuration (Client-side)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (Server-side)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email_from_json
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_private_key_from_json\n-----END PRIVATE KEY-----\n"
```

## 7. Set Up Firestore Security Rules

1. Go to "Firestore Database" > "Rules" tab
2. Replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /customers/{customerId} {
      allow read, write: if request.auth != null;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. Click "Publish"

## 8. Test the Application

1. Run: `npm run dev`
2. Open: http://localhost:3000
3. Create account with email/password
4. Test login functionality
5. Try importing a CSV file

## Troubleshooting

- **"Invalid API key"**: Double-check environment variables
- **"Permission denied"**: Check Firestore rules
- **"Service account key issues"**: Ensure private key includes full key with newlines
- **Compilation errors**: Make sure Node.js version is 18+ and dependencies are installed

## CSV Format Example

Create a test CSV file:

```csv
name,phone,address,tags
John Doe,+1234567890,123 Main St,premium,active
Jane Smith,+0987654321,456 Oak Ave,vip
```

The application should now be fully functional with Firebase authentication and database!
