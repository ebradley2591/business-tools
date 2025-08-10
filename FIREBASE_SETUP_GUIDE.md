# Firebase Setup Guide for Multi-Tenant SaaS Platform

This guide will walk you through setting up Firebase for the Smart Customer Directory multi-tenant SaaS platform.

## 🔥 Firebase Project Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: "smart-customer-directory-saas"
4. Enable Google Analytics (optional but recommended)
5. Click "Create project"

### 2. Enable Authentication

1. In Firebase project, click "Authentication" in left sidebar
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Click "Email/Password"
5. Enable "Email/Password" authentication
6. Click "Save"

### 3. Create Firestore Database

1. Click "Firestore Database" in left sidebar
2. Click "Create database"
3. Choose "Start in production mode" (we'll set up security rules)
4. Select location closest to your users
5. Click "Done"

### 4. Set Up Firestore Security Rules

1. Go to "Firestore Database" > "Rules" tab
2. Replace the existing rules with the content from `firestore.rules` file
3. Click "Publish"

**Important**: The security rules enforce:

- Multi-tenant data isolation
- Role-based access control
- Subscription status checks
- Admin-only operations for sensitive data

### 5. Create Firestore Indexes

You'll need to create composite indexes for efficient queries. Go to "Firestore Database" > "Indexes" tab and create:

#### Composite Indexes:

1. **Collection**: `customers`

   - Fields: `tenant_id` (Ascending), `createdAt` (Descending)
   - Query scope: Collection

2. **Collection**: `customFields`

   - Fields: `tenant_id` (Ascending), `order` (Ascending)
   - Query scope: Collection

3. **Collection**: `tenantUsers`
   - Fields: `tenant_id` (Ascending), `createdAt` (Descending)
   - Query scope: Collection

### 6. Get Firebase Configuration

1. Click gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll to "Your apps" section
4. Click web icon (</>)
5. Register app with nickname: "smart-customer-directory-web"
6. Copy the Firebase config object

### 7. Get Service Account Key

1. In Project settings, go to "Service accounts" tab
2. Click "Generate new private key"
3. Click "Generate key"
4. Download the JSON file

### 8. Configure Environment Variables

Create `.env.local` file in project root:

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

## 🔐 Multi-Tenant Data Structure

The application uses the following Firestore collections:

### Collections Structure:

```
/tenants/{tenantId}
├── name: string
├── createdAt: timestamp
├── updatedAt: timestamp
├── subscription_status: 'active' | 'inactive'
├── plan: 'free' | 'pro' | 'enterprise'
└── settings: {
    maxUsers: number,
    maxCustomers: number,
    features: string[]
}

/tenantUsers/{userId}
├── uid: string
├── tenant_id: string
├── role: 'admin' | 'user'
├── email: string
├── name: string (optional)
├── createdAt: timestamp
├── updatedAt: timestamp
└── lastLoginAt: timestamp

/subscriptions/{tenantId}
├── tenant_id: string
├── status: 'active' | 'inactive' | 'past_due' | 'canceled'
├── plan: 'free' | 'pro' | 'enterprise'
├── current_period_start: timestamp
├── current_period_end: timestamp
├── cancel_at_period_end: boolean
├── stripe_customer_id: string (optional)
├── stripe_subscription_id: string (optional)
├── createdAt: timestamp
└── updatedAt: timestamp

/customers/{customerId}
├── tenant_id: string
├── name: string
├── phone: string
├── address: string
├── email: string (optional)
├── secondaryContactName: string (optional)
├── secondaryContactPhone: string (optional)
├── tags: string[]
├── customFields: { [key: string]: any }
├── ownershipHistory: [
│   ├── name: string
│   └── timestamp: timestamp
│ ]
├── createdAt: timestamp
└── updatedAt: timestamp

/customFields/{fieldId}
├── tenant_id: string
├── name: string
├── type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'boolean'
├── required: boolean
├── options: string[] (for select type)
├── defaultValue: any
├── description: string
├── order: number
├── createdAt: timestamp
└── updatedAt: timestamp

/tenantInvites/{inviteId}
├── tenant_id: string
├── email: string
├── role: 'admin' | 'user'
├── invited_by: string
├── status: 'pending' | 'accepted' | 'expired'
├── expires_at: timestamp
└── createdAt: timestamp
```

## 🔑 Firebase Auth Custom Claims

The application uses Firebase Auth custom claims to store tenant and role information:

### Custom Claims Structure:

```json
{
  "tenant_id": "tenant_123",
  "role": "admin",
  "subscription_status": "active"
}
```

### Setting Custom Claims:

Custom claims are automatically set by the application when:

- A new tenant is created
- A user is added to a tenant
- Subscription status changes

## 🛡️ Security Rules Explanation

### Key Security Features:

1. **Multi-Tenant Isolation**: Users can only access data from their own tenant
2. **Role-Based Access**: Admins have full access, users have limited access
3. **Subscription Enforcement**: Only active tenants can access the application
4. **Data Validation**: All data is validated before being stored

### Security Rule Functions:

- `isAuthenticated()`: Checks if user is logged in
- `getUserTenantId()`: Gets tenant ID from custom claims
- `getUserRole()`: Gets user role from custom claims
- `isTenantActive()`: Checks if tenant subscription is active
- `isAdmin()`: Checks if user is admin
- `belongsToUserTenant()`: Checks if document belongs to user's tenant
- `canAccessTenant()`: Checks if user can access tenant data

## 🚀 Testing the Setup

### 1. Test Authentication

1. Run the application: `npm run dev`
2. Go to http://localhost:3000
3. Create a new account with a business name
4. Verify you're redirected to dashboard

### 2. Test Multi-Tenant Isolation

1. Create two different accounts with different business names
2. Add customers to each account
3. Verify users can only see their own customers

### 3. Test Role-Based Access

1. Create an admin account
2. Create a user account (requires admin to add users)
3. Verify different access levels

### 4. Test Subscription Enforcement

1. Manually set a tenant's subscription_status to 'inactive' in Firestore
2. Verify the user sees the subscription lockout screen

## 🔧 Troubleshooting

### Common Issues:

1. **"Permission denied" errors**

   - Check Firestore security rules
   - Verify custom claims are set correctly
   - Ensure tenant_id matches between user and data

2. **"User profile not found" errors**

   - Check if tenantUsers document exists for the user
   - Verify user was properly added to tenant

3. **"Tenant is inactive" errors**

   - Check subscription status in Firestore
   - Verify custom claims include subscription_status

4. **Index errors**
   - Create required composite indexes
   - Wait for indexes to build (can take several minutes)

### Debug Steps:

1. Check Firebase Console > Authentication > Users for custom claims
2. Check Firestore Database for proper data structure
3. Check Firebase Console > Functions > Logs for server-side errors
4. Check browser console for client-side errors

## 📊 Monitoring and Analytics

### Recommended Firebase Features:

1. **Firebase Analytics**: Track user engagement and feature usage
2. **Firebase Performance**: Monitor app performance
3. **Firebase Crashlytics**: Track and fix crashes
4. **Firebase Remote Config**: A/B testing and feature flags

### Security Monitoring:

1. **Firebase App Check**: Prevent abuse from unauthorized clients
2. **Firebase Security Rules**: Monitor rule violations
3. **Firebase Authentication**: Track login attempts and suspicious activity

## 🔄 Production Deployment

### Before Going Live:

1. **Update Security Rules**: Ensure production rules are properly configured
2. **Set Up Monitoring**: Enable Firebase Analytics and Crashlytics
3. **Configure Domains**: Add your production domain to authorized domains
4. **Set Up Backup**: Configure Firestore backup
5. **Test Thoroughly**: Test all multi-tenant scenarios

### Environment Variables for Production:

```bash
# Production Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_production_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_production_domain.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_production_project_id
# ... other production config

# Production Admin SDK
FIREBASE_PROJECT_ID=your_production_project_id
FIREBASE_CLIENT_EMAIL=your_production_service_account_email
FIREBASE_PRIVATE_KEY="your_production_private_key"
```

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Auth Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Firestore Indexes](https://firebase.google.com/docs/firestore/query-data/indexing)

---

**Note**: This setup creates a production-ready multi-tenant SaaS platform with proper security, scalability, and maintainability. Make sure to test thoroughly before deploying to production.
