# QuickChat frontend

## Production configuration

Set `BACKEND_URL` in the frontend deployment environment to the public URL of
the running server. For the current Vercel production deployment, set it to
`https://quickchat-ygpw.onrender.com`. Vite embeds this URL into the production
bundle at build time, so changing the variable requires a new frontend
deployment.

The Vite configuration exposes only `BACKEND_URL` to frontend code. Do not put
backend secrets in the frontend environment.

The server must set `CLIENT_URL` to the exact frontend origin, including the
`https://` scheme and without a trailing slash.

## Development

Copy `.env.example` to `.env` and run:

```bash
npm run dev
```

## Build

```bash
npm run build
```
