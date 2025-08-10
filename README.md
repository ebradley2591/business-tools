# Security Testing Tools

This workspace contains security testing tools and scripts for auditing web applications.

## Contents

- **`security_test.py`** - Comprehensive security testing script for web applications
- **`requirements.txt`** - Python dependencies for the security testing script
- **`SECURITY_TESTING_README.md`** - Detailed documentation for using the security testing script
- **`SECURITY_AUDIT_REPORT.md`** - Sample security audit report for Smart Customer Directory

## Quick Start

1. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

2. **Run security test:**
   ```bash
   python security_test.py https://your-site.com --verbose
   ```

## Supported Tests

- Authentication bypass testing
- SQL injection testing
- Cross-site scripting (XSS) testing
- CSRF vulnerability testing
- Rate limiting testing
- Information disclosure testing
- CORS misconfiguration testing
- Security headers testing
- Input validation testing
- Authorization controls testing

## Usage Examples

```bash
# Test production site
python security_test.py https://app.automatehubstudio.com --verbose

# Test local development
python security_test.py http://localhost:3000 --verbose

# Test staging environment
python security_test.py https://staging.example.com --verbose
```

## Important Notes

⚠️ **Legal and Ethical Considerations:**

- Only test your own applications or applications you have explicit permission to test
- Do not use these tools for malicious purposes
- Respect rate limits and terms of service
- Consider running tests during off-peak hours

## Documentation

See `SECURITY_TESTING_README.md` for comprehensive documentation and usage instructions.

## Sample Reports

See `SECURITY_AUDIT_REPORT.md` for an example of the security audit report format.
