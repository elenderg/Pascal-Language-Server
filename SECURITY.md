# Security Policy

## Supported Versions

Security updates are provided for the latest stable release of Pascal Language Server.

| Version | Supported |
| ------- | --------- |
| 1.0.x   | Yes       |
| < 1.0.0 | No        |

## Reporting a Vulnerability

If you discover a potential security vulnerability in Pascal Language Server, please report it responsibly.

**Do not disclose security vulnerabilities through public GitHub issues.**

Instead, use GitHub's private vulnerability reporting feature, if enabled for this repository, to submit your report confidentially.

Please include as much of the following information as possible:

- A description of the vulnerability and its potential impact.
- The affected version or commit.
- Steps to reproduce the issue.
- A minimal proof of concept, if available.
- Any suggested mitigation or fix, if known.

## Response and Disclosure

Reports will be reviewed as soon as reasonably possible. The reporter may be contacted for additional information or clarification.

Please allow reasonable time for investigation and remediation before publicly disclosing a vulnerability.

There is no guaranteed response or remediation timeframe.

## Scope

Security reports may include issues affecting:

- The language server's handling of Pascal source files and workspace contents.
- Parsing or symbol resolution that could cause unexpected behavior, crashes, or resource exhaustion.
- File system access and resolution of source files or unit dependencies.
- The handling of external compiler processes and their diagnostics.
- Unexpected execution of commands or access to files beyond the intended scope of the extension.

Reports concerning vulnerabilities in dependencies may also be relevant if they affect Pascal Language Server.

## Security Best Practices

Users should install the extension from trusted sources and keep it updated to the latest supported release.

When working with untrusted Pascal projects, users should exercise caution with build configurations, compiler directives, external tools, and other project components that may execute commands or access local resources.

