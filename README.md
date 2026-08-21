# Quik Backend

Quik Backend is the server-side API for the Quik real-time social platform. It provides authenticated services for social feeds, friendships, notifications, typing presence, media uploads, email delivery, AI features, and video-call integration.

The application is built with Node.js and Express. Firebase Admin provides authentication and database access, Upstash Redis supports caching and rate limiting, Cloudflare R2 handles object storage, Resend delivers transactional email, and Swagger exposes the API specification.

## Architecture

The codebase follows a modular, feature-oriented architecture. Each business domain owns its routes, controllers, services, and unit tests, keeping responsibilities isolated and allowing features to evolve independently.

```text
server.js
src/
├── config/
├── middlewares/
├── modules/
│   ├── ai/
│   ├── friends/
│   ├── mail/
│   ├── posts/
│   ├── stringee/
│   ├── typing/
│   ├── uploads/
│   └── users/
└── utils/
test/
├── config/
├── middlewares/
├── modules/
└── utils/
```

`server.js` is the single application entry point for local execution and Vercel deployment. Shared infrastructure lives under `config`, cross-cutting request logic belongs to `middlewares`, and reusable helpers are maintained in `utils`.

## Core Capabilities

- Firebase-based authentication and data access
- Personalized posts, comments, likes, and feed caching
- Friend requests, recommendations, and notifications
- Real-time typing presence
- Signed media uploads to Cloudflare R2
- Stringee access-token and room management
- AI-assisted features
- Transactional email delivery
- Redis-backed caching and rate limiting
- OpenAPI documentation with Swagger
- Isolated unit tests for backend modules
