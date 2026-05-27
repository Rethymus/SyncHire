# OAuth Setup Guide for SyncHire

This guide explains how to configure Google and GitHub OAuth authentication for the SyncHire platform.

## Overview

SyncHire supports OAuth 2.0 authentication with:
- **Google OAuth 2.0**: Allow users to sign in with their Google accounts
- **GitHub OAuth**: Allow users to sign in with their GitHub accounts

## Prerequisites

Before setting up OAuth, ensure you have:
- A Google Cloud account (for Google OAuth)
- A GitHub account (for GitHub OAuth)
- Admin access to your SyncHire application environment variables

## Google OAuth Setup

### Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client IDs**

### Step 2: Configure OAuth Consent Screen

1. If prompted, configure the OAuth consent screen:
   - Choose **External** user type
   - Add app information (name, logo, etc.)
   - Add required scopes:
     - `openid`
     - `email`
     - `profile`

### Step 3: Create OAuth Client ID

1. Application type: **Web application**
2. Name: `SyncHire Production` (or appropriate environment)
3. Authorized redirect URIs:
   - Development: `http://localhost:3000/auth/callback/google`
   - Production: `https://yourdomain.com/auth/callback/google`

### Step 4: Get Credentials

After creation, you'll receive:
- **Client ID**: Something like `123456789-abc123def456.apps.googleusercontent.com`
- **Client Secret**: A random string

## GitHub OAuth Setup

### Step 1: Register OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **OAuth Apps** > **New OAuth App**

### Step 2: Configure OAuth App

1. **Application name**: `SyncHire Production` (or appropriate environment)
2. **Homepage URL**: `https://yourdomain.com` (or `http://localhost:3000` for dev)
3. **Authorization callback URL**:
   - Development: `http://localhost:3000/auth/callback/github`
   - Production: `https://yourdomain.com/auth/callback/github`
4. **Application description**: Add a brief description
5. **Homepage URL**: Your application URL

### Step 3: Get Credentials

After creation, you'll receive:
- **Client ID**: A random string
- **Client Secret**: Click "Generate a new client secret" to get this

## Environment Configuration

Add the following variables to your `.env` file:

```bash
# Google OAuth Configuration
GOOGLE_OAUTH_CLIENT_ID=your_google_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth Configuration
GITHUB_OAUTH_CLIENT_ID=your_github_client_id
GITHUB_OAUTH_CLIENT_SECRET=your_github_client_secret

# Frontend OAuth URLs
NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=your_google_client_id
NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID=your_github_client_id
```

## Database Migration

Run the OAuth accounts table migration:

```bash
cd api
python -m alembic upgrade head
```

This creates the `oauth_accounts` table that stores:
- User OAuth relationships
- Provider information (Google/GitHub)
- Provider user IDs
- Account metadata

## Testing OAuth Configuration

### 1. Check Provider Availability

Test if OAuth providers are properly configured:

```bash
curl http://localhost:8000/api/oauth/providers
```

Expected response:
```json
{
  "providers": {
    "google": {
      "available": true,
      "display_name": "Google"
    },
    "github": {
      "available": true,
      "display_name": "GitHub"
    }
  }
}
```

### 2. Test Authorization Flow

1. Navigate to `/login` or `/signup`
2. Click "Google" or "GitHub" button
3. You should be redirected to the OAuth provider
4. Authorize the application
5. You should be redirected back and logged in

### 3. Check Database

Verify OAuth accounts are created:

```sql
SELECT * FROM oauth_accounts;
```

## Security Best Practices

### 1. Environment Variables
- Never commit OAuth credentials to version control
- Use different credentials for development/production
- Rotate secrets periodically
- Use secure random strings for secrets

### 2. Redirect URIs
- Always use HTTPS in production
- Only add necessary redirect URIs
- Validate redirect URIs on the backend

### 3. Token Storage
- Access tokens are stored encrypted in the database
- Reference tokens are used instead of actual provider tokens
- Implement token refresh mechanisms

### 4. Error Handling
- Generic error messages to prevent user enumeration
- Proper logging of OAuth failures
- Graceful fallback to email/password login

## Troubleshooting

### Common Issues

#### 1. "OAuth is not configured" Error
**Cause**: Missing or invalid environment variables
**Solution**:
- Check that all required environment variables are set
- Restart the application after changing environment variables
- Verify variables are loaded correctly

#### 2. "Redirect URI mismatch" Error
**Cause**: Redirect URI not registered in OAuth provider
**Solution**:
- Add the exact redirect URI to your OAuth app configuration
- Check for trailing slashes and http vs https
- Ensure the frontend URL matches the registered redirect URI

#### 3. "Invalid OAuth state" Error
**Cause**: CSRF protection state validation failed
**Solution**:
- Clear browser cookies and sessionStorage
- Check that state generation and validation use the same method
- Ensure session storage is available

#### 4. Email not verified
**Cause**: User's OAuth email is not verified
**Solution**:
- Google/GitHub accounts must have verified emails
- Users should verify their email with the provider first

### Debug Mode

Enable detailed OAuth logging:

```python
# In api/app/core/config.py
LOG_LEVEL=debug
```

This will log:
- OAuth flow steps
- Token exchange responses
- User information received
- Error details

## OAuth Flow Diagram

```
┌─────────┐         ┌──────────────┐         ┌─────────────┐
│  User   │         │   Frontend   │         │   Backend   │
└────┬────┘         └──────┬───────┘         └──────┬──────┘
     │                     │                        │
     │  1. Click OAuth     │                        │
     │     button          │                        │
     ├────────────────────>│                        │
     │                     │                        │
     │                     │  2. Generate state     │
     │                     │  3. Redirect to OAuth  │
     │                     ├───────────────────────>│
     │                     │                        │
     │  4. Redirect to     │                        │
     │     provider        │                        │
     ├─────────────────────┘                        │
     │                                              │
     │  5. Authorize with provider                 │
     ├───────────────────────────────────────────> │
     │                                              │
     │  6. Callback with code                       │
     ├─────────────────────┐                        │
     │                     │                        │
     │                     │  7. Exchange code      │
     │                     │     for tokens         │
     │                     ├───────────────────────>│
     │                     │                        │
     │                     │  8. Get user info      │
     │                     │     from provider      │
     │                     ├───────────────────────>│
     │                     │                        │
     │                     │  9. Create/update user │
     │                     │     Generate JWT       │
     │                     ├───────────────────────>│
     │                     │                        │
     │  10. Login success  │                        │
     ├<────────────────────┘                        │
     │                                              │
```

## API Endpoints

### OAuth Provider Status
```http
GET /api/oauth/providers
```

### OAuth Authorization URL
```http
GET /api/oauth/authorize/{provider}
```

### OAuth Callback
```http
POST /api/oauth/callback
Content-Type: application/json

{
  "code": "authorization_code_from_provider",
  "redirect_uri": "redirect_uri_used",
  "provider": "google" | "github"
}
```

### Unlink OAuth Account
```http
DELETE /api/oauth/unlink/{provider}
Authorization: Bearer {access_token}
```

## Production Considerations

### 1. Rate Limiting
- OAuth endpoints have rate limiting (10 requests/minute)
- Implement exponential backoff for retries
- Monitor OAuth usage patterns

### 2. Monitoring
- Track OAuth success/failure rates
- Monitor token refresh failures
- Alert on unusual OAuth activity

### 3. Backup & Recovery
- Regular backups of oauth_accounts table
- Document OAuth configuration
- Have fallback authentication methods

### 4. Compliance
- GDPR: User data from OAuth providers
- Terms of Service: OAuth provider requirements
- Data retention: OAuth token lifecycle

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review application logs for detailed error messages
3. Verify OAuth provider status pages
4. Check SyncHire documentation for updates

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [OAuth 2.0 Specification](https://oauth.net/2/)
- [SyncHire API Documentation](./API_DOCUMENTATION.md)