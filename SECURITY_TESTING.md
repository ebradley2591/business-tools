# Security Testing

Security testing tools and scripts have been moved to a separate workspace to avoid conflicts with the main project dependencies.

## Location

Security testing tools are located in:

```
../Security Testing Tools/
```

## Quick Access

To run security tests on this application:

1. Navigate to the security testing workspace:

   ```bash
   cd "../Security Testing Tools"
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Run security test:
   ```bash
   python security_test.py https://app.automatehubstudio.com --verbose
   ```

## Latest Security Audit

The most recent security audit found:

- **3 Critical Vulnerabilities**: Authentication bypass on dashboard, users, and billing pages
- **1 Warning**: Missing X-XSS-Protection header
- **5 Passed Tests**: Excellent security headers implementation

See the full audit report in the Security Testing Tools workspace.

## Security Status

**Overall Grade: C+ (Needs Immediate Attention)**

Critical authentication bypass vulnerabilities must be addressed before production use.
