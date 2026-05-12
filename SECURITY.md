# Security Policy

## Reporting a vulnerability

If you find a security issue in Marcus, **do not open a public GitHub issue.**

Email: `r@resrom.com` (subject line: `[SECURITY] Marcus — <short summary>`)

In your report please include:

- A short description of the issue and its impact.
- Steps to reproduce, including the affected endpoint, payload, or input.
- Whether you have a proof-of-concept and whether it has been used against the production system.
- Your preferred name/handle for credit (optional).

We will acknowledge receipt within **3 business days** and aim to provide a substantive update within **7 business days**.

## Scope

In scope:

- The hosted MCP server at `marcus-second-brain.com` and `www.marcus-second-brain.com`.
- The `marcus-mcp-server` source code in this repository, when run with the default configuration.
- OAuth, audit-log anonymization, vault provisioning, MCP tool surface.

Out of scope:

- Issues that require physical access to a user's device.
- Vulnerabilities in third-party dependencies that we have not yet patched and that have no available fix (we welcome reports, but we cannot accept responsibility for upstream issues).
- Self-hosted instances misconfigured by their operator.

## Coordinated disclosure

We follow coordinated disclosure. Please give us a reasonable window (typically 90 days, less for actively exploited issues) before publishing details.

If you find a critical issue affecting end-user data, we will prioritize a fix and publish a post-mortem after deployment.

## What is NOT a vulnerability

- The use of the Business Source License 1.1 (this is a licensing question, not security).
- Listing of dependencies in the SBOM artifact (this is intentional supply-chain transparency).
- The `r@resrom.com` contact email on `/privacy`, `/terms`, and in this file (intentional service contact information).
