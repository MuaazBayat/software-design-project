# Security Vulnerabilities Report

This document provides a comprehensive overview of known security vulnerabilities across all services in the project.

**Last Updated:** 2025-09-30

## Summary

| Service | Total Vulnerabilities | Critical | High | Moderate | Low |
|---------|----------------------|----------|------|----------|-----|
| Frontend | 3 | 0 | 1 | 2 | 0 |
| Core | 4 | 0 | 0 | 1 | 3 |
| Matchmaking | 4 | 0 | 0 | 1 | 3 |
| Messaging | 4 | 0 | 0 | 1 | 3 |
| Moderation | 4 | 0 | 0 | 1 | 3 |
| **TOTAL** | **19** | **0** | **1** | **6** | **12** |

---

## Frontend Service (Node.js/npm)

### 1. jsPDF - HIGH Severity

**Package:** `jspdf` (version ≤3.0.1)

**Vulnerabilities:**
- **GHSA-w532-jxjh-hjhj** - jsPDF Bypass Regular Expression Denial of Service (ReDoS)
  - **CVE:** N/A
  - **CWE:** CWE-400 (Uncontrolled Resource Consumption), CWE-770 (Allocation of Resources Without Limits)
  - **CVSS Score:** 0 (Not yet scored)
  - **Description:** jsPDF is vulnerable to Regular Expression Denial of Service (ReDoS) attacks.
  - **Advisory:** https://github.com/advisories/GHSA-w532-jxjh-hjhj

- **GHSA-8mvj-3j78-4qmw** - jsPDF Denial of Service (DoS)
  - **CVE:** N/A
  - **CWE:** CWE-20 (Improper Input Validation), CWE-835 (Loop with Unreachable Exit Condition)
  - **CVSS Score:** 7.5 (High)
  - **Vector String:** CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H
  - **Description:** jsPDF is vulnerable to Denial of Service attacks through infinite loops.
  - **Advisory:** https://github.com/advisories/GHSA-8mvj-3j78-4qmw

**Affected Range:** ≤3.0.1

**Fix Available:** Upgrade to `jspdf@3.0.3`

**Impact:** Direct dependency - requires major version upgrade

---

### 2. DOMPurify - MODERATE Severity

**Package:** `dompurify` (version <3.2.4)

**Vulnerability:**
- **GHSA-vhxf-7vqr-mrjg** - DOMPurify allows Cross-site Scripting (XSS)
  - **CVE:** N/A
  - **CWE:** CWE-79 (Cross-site Scripting)
  - **CVSS Score:** 4.5 (Moderate)
  - **Vector String:** CVSS:3.1/AV:L/AC:H/PR:N/UI:N/S:C/C:L/I:L/A:N
  - **Description:** DOMPurify has a vulnerability that allows Cross-site Scripting (XSS) attacks.
  - **Advisory:** https://github.com/advisories/GHSA-vhxf-7vqr-mrjg

**Affected Range:** <3.2.4

**Fix Available:** Transitive dependency through `jspdf@3.0.3` upgrade

**Impact:** Indirect dependency via jspdf

---

### 3. Next.js - MODERATE Severity

**Package:** `next` (version 15.0.0-canary.0 - 15.4.6)

**Vulnerabilities:**
- **GHSA-g5qg-72qw-gw5v** - Next.js Affected by Cache Key Confusion for Image Optimization API Routes
  - **CVE:** N/A
  - **CWE:** CWE-524 (Use of Cache Containing Sensitive Information)
  - **CVSS Score:** 6.2 (Moderate)
  - **Vector String:** CVSS:3.1/AV:L/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N
  - **Affected Range:** ≥15.0.0 ≤15.4.4
  - **Description:** Cache key confusion vulnerability in Next.js image optimization routes.
  - **Advisory:** https://github.com/advisories/GHSA-g5qg-72qw-gw5v

- **GHSA-xv57-4mr9-wg8v** - Next.js Content Injection Vulnerability for Image Optimization
  - **CVE:** N/A
  - **CWE:** CWE-20 (Improper Input Validation)
  - **CVSS Score:** 4.3 (Moderate)
  - **Vector String:** CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:L/A:N
  - **Affected Range:** ≥15.0.0 ≤15.4.4
  - **Description:** Content injection vulnerability in Next.js image optimization functionality.
  - **Advisory:** https://github.com/advisories/GHSA-xv57-4mr9-wg8v

- **GHSA-4342-x723-ch2f** - Next.js Improper Middleware Redirect Handling Leads to SSRF
  - **CVE:** N/A
  - **CWE:** CWE-918 (Server-Side Request Forgery)
  - **CVSS Score:** 6.5 (Moderate)
  - **Vector String:** CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:L/A:N
  - **Affected Range:** ≥15.0.0-canary.0 <15.4.7
  - **Description:** Improper middleware redirect handling can lead to Server-Side Request Forgery (SSRF).
  - **Advisory:** https://github.com/advisories/GHSA-4342-x723-ch2f

**Fix Available:** Upgrade to `next@15.5.4`

**Impact:** Direct dependency - minor version upgrade required

---

## Python Services (Core, Matchmaking, Messaging, Moderation)

All Python-based services share the same vulnerability profile due to identical dependency sets.

### Common Vulnerabilities Across All Python Services

#### 1. Django - MODERATE Severity

**Package:** `django` (version 5.2.5)

**Vulnerability:**
- **GHSA-6w2r-r2m5-xq5w** / **CVE-2025-57833** - Django SQL Injection in FilteredRelation
  - **CWE:** N/A
  - **CVSS Score:** N/A
  - **Description:** Django versions 4.2 before 4.2.24, 5.1 before 5.1.12, and 5.2 before 5.2.6 are vulnerable to SQL injection in FilteredRelation column aliases. An attacker can exploit this by passing a suitably crafted dictionary using dictionary expansion as the **kwargs to QuerySet.annotate() or QuerySet.alias().
  - **Advisory:** https://github.com/advisories/GHSA-6w2r-r2m5-xq5w

**Affected Range:** 4.2 - 4.2.23, 5.1 - 5.1.11, 5.2 - 5.2.5

**Fix Versions Available:** 4.2.24, 5.1.12, 5.2.6

**Recommendation:** Upgrade to `django@5.2.6`

**Impact:** Direct dependency - patch version upgrade required

---

#### 2. Python-Future - MODERATE/HIGH Severity (No Fix Available)

**Package:** `future` (version 1.0.0)

**Vulnerability:**
- **GHSA-xqrq-4mgf-ff32** / **CVE-2025-50817** - Arbitrary Code Execution via test.py Import
  - **CWE:** N/A
  - **CVSS Score:** N/A
  - **Description:** A vulnerability in Python-Future modules 0.14.0 and above allows for arbitrary code execution via the unintended import of a file named test.py. When the module is loaded, it automatically imports test.py, if present in the same directory or in the sys.path. This behavior can be exploited by an attacker who has the ability to write files to the server, allowing the execution of arbitrary code.
  - **Advisory:** https://github.com/advisories/GHSA-xqrq-4mgf-ff32

**Affected Range:** ≥0.14.0

**Fix Versions Available:** None

**Mitigation:**
- Ensure no untrusted `test.py` files exist in the application's working directory or sys.path
- Implement strict file upload validation and directory access controls
- Monitor for unauthorized file creation
- Consider replacing the `future` package with alternative solutions if possible

**Impact:** Direct dependency - no patch available, requires manual mitigation

---

#### 3. Setuptools - LOW Severity (Multiple Vulnerabilities)

**Package:** `setuptools` (version 65.5.0)

**Vulnerabilities:**

##### a. PYSEC-2022-43012 / CVE-2022-40897 - Regular Expression Denial of Service
- **CWE:** N/A
- **CVSS Score:** N/A
- **Description:** Python Packaging Authority (PyPA) setuptools before 65.5.1 allows remote attackers to cause a denial of service via HTML in a crafted package or custom PackageIndex page. There is a Regular Expression Denial of Service (ReDoS) in package_index.py.
- **Advisory:** https://osv.dev/vulnerability/PYSEC-2022-43012

**Affected Range:** <65.5.1

**Fix Version:** 65.5.1

---

##### b. PYSEC-2025-49 / CVE-2025-47273 / GHSA-5rjg-fvgr-3xxf - Path Traversal Vulnerability
- **CWE:** N/A
- **CVSS Score:** N/A
- **Description:** setuptools is a package that allows users to download, build, install, upgrade, and uninstall Python packages. A path traversal vulnerability in `PackageIndex` is present in setuptools prior to version 78.1.1. An attacker would be allowed to write files to arbitrary locations on the filesystem with the permissions of the process running the Python code, which could escalate to remote code execution depending on the context.
- **Advisory:** https://github.com/advisories/GHSA-5rjg-fvgr-3xxf

**Affected Range:** <78.1.1

**Fix Version:** 78.1.1

**Combined Recommendation:** Upgrade to `setuptools@78.1.1` or later

**Impact:** System-level dependency - upgrade recommended

---

## Remediation Priority

### Critical Priority
None identified

### High Priority
1. **Frontend: jsPDF** - Upgrade to version 3.0.3 to fix DoS and ReDoS vulnerabilities

### Moderate Priority
1. **All Python Services: Django** - Upgrade to version 5.2.6 to fix SQL injection vulnerability
2. **Frontend: Next.js** - Upgrade to version 15.5.4 to fix image optimization and SSRF vulnerabilities
3. **All Python Services: Python-Future** - Implement mitigation strategies (no patch available)

### Low Priority
1. **All Python Services: setuptools** - Upgrade to version 78.1.1 or later

---

## Remediation Commands

### Frontend Service
```bash
cd services/frontend
npm audit fix --force  # For jsPDF major version upgrade
npm update next        # For Next.js minor version upgrade
npm audit              # Verify fixes
```

### Python Services (Core, Matchmaking, Messaging, Moderation)
```bash
# For each service directory
cd services/<service-name>

# Update Django
pip install --upgrade "django>=5.2.6"

# Update setuptools
pip install --upgrade "setuptools>=78.1.1"

# Verify the future package usage and implement mitigations
# Update requirements.txt with new versions
pip freeze > requirements.txt

# Run security audit again
pip-audit
```

---

## Monitoring and Maintenance

### Recommended Practices
1. **Regular Audits:** Run security audits weekly or before each deployment
   - Frontend: `npm audit`
   - Python services: `pip-audit`

2. **Automated Scanning:** Configure CI/CD pipelines to fail on high/critical vulnerabilities

3. **Dependency Updates:** Review and update dependencies monthly

4. **Security Advisories:** Subscribe to security advisories for:
   - Next.js: https://github.com/vercel/next.js/security/advisories
   - Django: https://www.djangoproject.com/weblog/
   - npm: https://github.com/advisories
   - Python: https://pypi.org/security/

5. **Vulnerability Database:** Monitor CVE databases and GitHub Security Advisories

---

## Additional Notes

### Python-Future Mitigation Strategy
Since the `future` package has no available fix:
1. Audit all directories in sys.path for unauthorized `test.py` files
2. Implement file upload restrictions
3. Use application sandboxing where possible
4. Consider migrating away from the `future` package if feasible
5. Document this as an accepted risk with implemented mitigations

### Testing After Remediation
After applying fixes:
1. Run full test suites for each service
2. Verify no breaking changes introduced
3. Perform integration testing
4. Re-run security audits to confirm vulnerabilities resolved

---

## References

- [npm audit documentation](https://docs.npmjs.com/cli/v10/commands/npm-audit)
- [pip-audit documentation](https://github.com/pypa/pip-audit)
- [OWASP Vulnerability Management Guide](https://owasp.org/www-community/Vulnerability_Management)
- [GitHub Security Advisories](https://github.com/advisories)
- [National Vulnerability Database](https://nvd.nist.gov/)