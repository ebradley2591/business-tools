# Email Setup Guide

## Overview

The Smart Customer Directory now includes email functionality for user invitations. When a tenant admin invites a user, an email is sent with a link to accept the invitation and create their account.

## Email Service Setup

### Option 1: Resend (Recommended)

1. **Sign up for Resend**: Visit [resend.com](https://resend.com) and create a free account
2. **Get API Key**: From your Resend dashboard, copy your API key
3. **Configure Environment**: Add the API key to your `.env.local` file:
   ```
   RESEND_API_KEY=your_resend_api_key_here
   ```

### Option 2: No Email Service (Fallback)

If you don't configure an email service, invitations will still be created in the database, but no emails will be sent. The system will log invitation details to the console instead.

## Email Configuration

### Environment Variables

Add these to your `.env.local` file:

```bash
# Email Service (Resend)
RESEND_API_KEY=your_resend_api_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Customizing Email Content

The email template is defined in `lib/email-service.ts`. You can customize:

- **From address**: Change `noreply@automatehubstudio.com` to your domain
- **Email subject**: Modify the subject line
- **Email content**: Update the HTML template
- **Styling**: Modify the CSS styles in the HTML

## How It Works

1. **Invitation Creation**: When an admin invites a user, the system:

   - Creates an invitation record in the database
   - Generates a unique invitation URL
   - Sends an email with the invitation link

2. **Email Content**: The email includes:

   - Organization name
   - Inviter's name
   - User's role
   - Invitation link
   - Expiration date (7 days)

3. **Invitation Acceptance**: When the user clicks the link:
   - They see an invitation page with organization details
   - They can create their account with name, email, and password
   - The system creates their Firebase Auth account
   - They're added to the tenant with the specified role

## Testing

### With Email Service

1. Configure `RESEND_API_KEY` in your environment
2. Invite a user from the Users page
3. Check the user's email for the invitation
4. Click the invitation link to test the acceptance flow

### Without Email Service

1. Leave `RESEND_API_KEY` unset
2. Invite a user from the Users page
3. Check the console logs for invitation details
4. Manually visit `/invite/[inviteId]` to test the acceptance flow

## Troubleshooting

### Email Not Sending

- Check that `RESEND_API_KEY` is set correctly
- Verify your Resend account is active
- Check the console for error messages
- Ensure the from email address is verified in Resend

### Invitation Link Not Working

- Verify `NEXT_PUBLIC_APP_URL` is set correctly
- Check that the invitation hasn't expired (7 days)
- Ensure the invitation status is 'pending'

### User Creation Fails

- Check Firebase Auth configuration
- Verify user limits haven't been reached
- Ensure the email matches the invitation exactly

## Security Notes

- Invitations expire after 7 days
- Email addresses must match exactly (case-insensitive)
- Users can only accept invitations once
- All invitation data is stored securely in Firestore
