# Bank of Namibia P2P Challenge

Angular frontend plus Node.js mock API for the IPN P2P payment assessment.

## Run

Use Node 20 or Node 22 LTS and run:

```bash
npm start
```

That command:

- installs or refreshes dependencies,
- starts the API on `http://localhost:3000`,
- starts the web app on `http://localhost:4200`,
- opens the web app in your browser automatically.

## What is implemented

- strict client and server validation for account numbers, amount, currency, reference, and `clientReference`,
- deterministic mock outcomes for success, insufficient funds, internal error, and duplicate `clientReference`,
- OpenAPI docs at `http://localhost:3000/api/docs`.

## Assumptions

- `clientReference` uniqueness is enforced in memory for the lifetime of the API process,
- authentication, persistence, encryption, and real clearing or settlement are intentionally out of scope.
