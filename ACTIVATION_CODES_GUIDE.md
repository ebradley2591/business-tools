# Activation Codes Guide

This guide explains the activation code system for the Smart Customer Directory platform, designed for development testing and early adopter access.

## 🎯 Overview

Activation codes provide **permanent access** to the platform without subscription renewal requirements. This system is perfect for:

- **Development Testing**: Unlimited access for developers
- **Early Adopters**: Contributors who help build and improve the tool
- **Beta Testers**: Users who provide valuable feedback

## 🔑 Code Types

### 1. Development Codes (`dev`)

- **Plan**: Enterprise
- **Features**: Unlimited customers, all features
- **Usage**: Unlimited
- **Expiration**: None
- **Purpose**: Development and testing

### 2. Early Adopter Codes (`early_adopter`)

- **Plan**: Pro
- **Features**: Up to 1,000 customers, advanced features
- **Usage**: Limited (configurable)
- **Expiration**: Optional
- **Purpose**: Early adopters and contributors

### 3. Contributor Codes (`contributor`)

- **Plan**: Enterprise
- **Features**: Unlimited customers, all features
- **Usage**: Limited (configurable)
- **Expiration**: Optional
- **Purpose**: Active contributors and beta testers

## 🚀 Getting Started

### For Users

1. **Sign Up**: Go to the signup page
2. **Enter Code**: Click "Have a code?" and enter your activation code
3. **Complete Setup**: Your account will be automatically upgraded to the appropriate plan
4. **Enjoy**: Permanent access with no renewal required!

### For Administrators

#### Creating Activation Codes

1. **Access Admin Panel**: Navigate to `/admin/activation-codes`
2. **Create New Code**: Click "Create Code"
3. **Configure Settings**:
   - **Type**: Choose dev, early_adopter, or contributor
   - **Description**: Add a description for tracking
   - **Max Uses**: Set usage limit (leave empty for unlimited)
   - **Expiration**: Set expiration date (optional)
4. **Generate**: The system will create a unique code

#### Managing Codes

- **View Usage**: Click the eye icon to see who used the code
- **Deactivate**: Click the trash icon to disable a code
- **Copy Code**: Click the copy icon to copy the code to clipboard

## 📋 Default Codes

The system includes these default codes for immediate use:

```
🔧 Development: DEV2025UNLIMITED
   - Unlimited uses
   - Enterprise plan
   - No expiration

🚀 Early Adopter: EARLYADOPTER2025
   - 100 uses
   - Pro plan
   - No expiration

👥 Contributor: CONTRIBUTOR2025
   - 50 uses
   - Enterprise plan
   - No expiration
```

## 🔧 Technical Implementation

### Database Collections

#### `activationCodes`

```typescript
{
  id: string;
  code: string;
  type: 'dev' | 'early_adopter' | 'contributor';
  description?: string;
  maxUses?: number;
  currentUses: number;
  isActive: boolean;
  createdAt: Date;
  expiresAt?: Date;
  createdBy?: string;
  usedBy: string[];
}
```

#### `activationCodeUsage`

```typescript
{
  id: string;
  activationCodeId: string;
  userId: string;
  tenantId: string;
  usedAt: Date;
  userEmail: string;
  tenantName: string;
}
```

### API Endpoints

#### Validate Activation Code

```
POST /api/activation/validate
{
  "code": "DEV2025UNLIMITED",
  "tenantName": "My Business"
}
```

#### Admin Management

```
GET    /api/admin/activation-codes     # List all codes
POST   /api/admin/activation-codes     # Create new code
GET    /api/admin/activation-codes/:id # Get usage data
DELETE /api/admin/activation-codes/:id # Deactivate code
```

## 🛡️ Security Features

### Access Control

- Only administrators can create and manage activation codes
- All operations require authentication
- Usage tracking prevents code sharing

### Validation Rules

- Codes must be active
- Usage limits are enforced
- Expiration dates are checked
- Users can only use a code once

### Data Isolation

- Activation codes are global (not tenant-specific)
- Usage data is tracked for analytics
- Codes can be deactivated without affecting existing users

## 📊 Usage Tracking

The system tracks:

- **Who used each code**
- **When it was used**
- **Which tenant was created**
- **Usage statistics**

This helps administrators:

- Monitor code distribution
- Track early adopter engagement
- Identify active contributors
- Manage code inventory

## 🔄 Workflow

### User Signup with Code

1. User enters activation code during signup
2. System validates the code
3. Tenant is created with appropriate plan
4. User gets permanent access
5. Usage is recorded

### Code Management

1. Admin creates activation code
2. Code is shared with target users
3. Usage is tracked automatically
4. Admin can deactivate codes as needed

## 🎨 UI Components

### Signup Form

- Optional activation code field
- Collapsible section for code entry
- Benefits explanation when code field is shown

### Admin Panel

- Code creation form
- Usage statistics table
- Code management actions
- Usage history modal

## 🚀 Deployment

### Initial Setup

1. Deploy the application
2. Run the initialization script:
   ```bash
   node scripts/init-activation-codes.js
   ```
3. Default codes will be created automatically

### Environment Variables

No additional environment variables are required. The system uses existing Firebase configuration.

## 📈 Best Practices

### Code Distribution

- **Development Codes**: Share with your development team
- **Early Adopter Codes**: Distribute to beta testers and contributors
- **Contributor Codes**: Give to active community members

### Code Management

- **Monitor Usage**: Regularly check usage statistics
- **Rotate Codes**: Create new codes periodically
- **Deactivate Old Codes**: Disable codes that are no longer needed
- **Track Distribution**: Keep records of who received which codes

### Security

- **Limit Distribution**: Don't share codes publicly
- **Monitor Usage**: Watch for unusual usage patterns
- **Regular Review**: Periodically review active codes
- **Immediate Deactivation**: Deactivate compromised codes immediately

## 🔍 Troubleshooting

### Common Issues

#### "Invalid activation code"

- Check if the code exists in the database
- Verify the code is active
- Ensure the code hasn't expired

#### "Usage limit reached"

- The code has reached its maximum usage limit
- Create a new code or increase the limit

#### "Code already used"

- Users can only use a code once
- Provide a different code to the user

#### "Code expired"

- The code has passed its expiration date
- Create a new code with a later expiration

### Debug Steps

1. Check the activation codes collection in Firestore
2. Verify the code status (active/inactive)
3. Check usage statistics
4. Review server logs for validation errors

## 📞 Support

For issues with activation codes:

1. Check the troubleshooting section above
2. Review the admin panel for code status
3. Contact the development team with specific error messages
4. Provide the activation code and user email for investigation

---

**Note**: Activation codes provide permanent access to the platform. Use them responsibly and only share with trusted users who will contribute to the platform's development and success.
