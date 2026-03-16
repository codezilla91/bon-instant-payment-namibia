# Instant Payment Namibia Assessment Submission

Angular web application and Node.js API for the IPN P2P payment challenge.

## Run

Prerequisites:

- Node `22.22.0` LTS recommended
- Node `22.13.0+` LTS compatible
- Node `20.19.0+` LTS also supported
- Node `24.0.0+` also works if that is already your active Angular-compatible runtime
- npm is included with Node

Odd-numbered or current non-LTS Node releases should not be used for evaluation.

Then run:

```bash
git clone https://github.com/codezilla91/bon-instant-payment-namibia.git
cd bon-instant-payment-namibia
npm install
npm start
```

`npm install` installs the API and web dependencies through npm workspaces.
`npm start` runs the API and Angular app directly from source, waits for them to become ready, and opens the browser automatically. No manual build step is required first.

Supported environments: Windows, macOS, and Linux.

If the browser does not open automatically, open `http://localhost:4200` manually.

Useful local URLs:

- web app: `http://localhost:4200`
- API health: `http://localhost:3000/api/health`
- Swagger docs: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/openapi.json`
- API log file: `logs/api.log`

## What Was Built

- multi-page Angular flow for payment capture, confirmation, result, transaction history, support, and dashboard views
- modular Node.js API with `health` and `payments` feature modules
- client-side and server-side validation for the payment contract
- browser-backed wallet ledger and recent transaction history
- downloadable and printable proof of payment for successful transactions

## Technology Choices

- `Angular 20`
  chosen for a form-heavy, enterprise-style front end where strong structure, routing, dependency injection, and reactive forms matter
- `Node.js + Express`
  chosen for a small JSON API that is easy to run, easy to review, and fast to extend into a larger integration service
- `TypeScript`
  used across the web and API so validation, response handling, and payment models stay explicit and maintainable
- `Bootstrap 5 + custom SCSS`
  used for responsive layout speed while still allowing the product styling to be tailored to the Bank of Namibia look and feel
- `Browser storage`
  used because the brief excludes persistence, but the UX still benefits from keeping wallet state, recent transactions, privacy mode, and support entries across refreshes
- `jsPDF`
  used to generate proof-of-payment documents on the client without adding server-side file generation or storage
- `OpenAPI + Swagger UI`
  used to publish the payment contract in a format that is easy to inspect, test, and hand over to other developers or integration partners

## Why Angular And Node.js

Angular fits the shape of this problem well. The challenge is centered on validation, state transitions, user guidance, and predictable UI behavior, which are all areas where Angular's reactive forms and component structure work well.

Node.js was chosen for the API because the challenge only needs a focused JSON service, not a large platform. It keeps the stack lightweight, lets the frontend and backend share the same language, and provides a clear path toward a larger payment-integration service if the solution grows later.

## Security Notes

The OWASP Top 10 was used as a practical design checklist so the solution does not stop at "it works" and ignore common web and API risks. This was applied in the following ways:

- strict input validation and duplicate reference protection reduce bad input and injection-style abuse
- `helmet`, disabled `x-powered-by`, bounded JSON body size, and scoped CORS reduce insecure defaults and misconfiguration risk
- `express-rate-limit` adds a basic abuse and throttling control
- structured request logging with correlation IDs improves traceability and operational review
- the solution keeps sensitive scope deliberately small: no authentication, no live bank connection, no secrets, and no database persistence in this challenge build

Not every OWASP category applies fully here because authentication, account management, and live participant connectivity are out of scope, but it was still useful as a secure-by-default review lens.

## Correlation IDs

The API accepts an incoming `x-correlation-id` header and also returns `x-correlation-id` on responses.

This is important in a payment context because it gives every request a trace key that can be followed across:

- client issue reports
- API logs
- validation failures
- business rule failures
- support follow-up and operational troubleshooting

For a real payment platform, correlation IDs help support teams and engineers investigate a single transaction path quickly without relying only on timestamps or account numbers.

## Logging

The API writes structured logs to the console and to `logs/api.log`.

This is important because payment systems need an operational trail, not just a UI result. Logs help with:

- tracing a payment from request to outcome
- investigating validation failures and business-rule failures
- matching a support issue to a correlation ID
- understanding service health and request timing during review or troubleshooting

In this build, the logs capture request start, request completion, validation failures, business-rule failures, and successful payment completion events.

## API Documentation

Swagger docs are available locally at `http://localhost:3000/api/docs`, with the raw OpenAPI document at `http://localhost:3000/api/openapi.json`.

This matters because payment integrations are contract-driven. Swagger makes the request shape, response model, headers, and examples visible in one place, which helps with:

- faster reviewer understanding of the integration contract
- easier manual testing without digging through source files
- cleaner onboarding for future developers
- a better path from this assessment build into a larger, production-oriented integration

The docs also show the optional `x-correlation-id` header and make it clear that the UI label `Payment reference ID` maps to the API field `clientReference`.

## Validation And Mock Behaviour

- `senderAccountNumber` and `receiverAccountNumber` must be numeric and at least 10 digits
- `amount` must be greater than zero
- `currency` must be `NAD`
- `reference` is required and limited to 50 characters
- `clientReference` is required, limited to 50 characters, and unique for the lifetime of the running API process
- valid requests succeed by default
- `ERR005` is returned when the sender account ends with `0001` or the payment amount is higher than the available wallet balance
- `ERR006` is returned when the sender or receiver account ends with `9999`, or when `x-simulate-error: ERR006` is supplied
- `ERR007` is returned when the same `clientReference` is submitted more than once during the current API runtime

## Assumptions

- the wallet starts with `NAD 30,000.00` for local testing
- `clientReference` uniqueness is enforced in memory only
- `clientReference` is presented to users as `Payment reference ID` in the web interface for clearer language
- the web app stores wallet state, payment history, privacy mode, and support entries in browser storage for continuity
- the web app shares its current wallet balance with the API so insufficient-funds checks stay consistent without a database
- authentication, persistence, encryption, and live participant integration are intentionally out of scope

## How The Integration Was Implemented

- the payment journey is intentionally split into capture, confirm, and result pages so users can review before completion
- the API is arranged into modules so the current mock can grow without collapsing into one large route file
- the proof-of-payment document uses a restrained document-style type scale so it reads like a formal payment record rather than a screen capture

## Verification

- `npm start`
- `npm run build:api`
- `npm run build:web`
- `npm run test:startup`
- `apps/web/node_modules/.bin/tsc -p apps/web/tsconfig.app.json --noEmit`
