# ⚡ Quik Backend - API & Architecture Guide

> This repository contains the core API services, caching logic, and third-party integrations for the Quik platform.

---

## 🏗️ System Architecture

Built on **Node.js** and **Express.js**, the backend acts as an orchestration layer between the client, the database, and various cloud services.

### ⚡ Performance & Caching (Upstash Redis)
To ensure low latency and minimize database reads:
-   **User Metadata**: Cached for quick lookup.
-   **Friend Recommendations**: Pre-computed and cached.
-   **Notification Badges**: Incremented atomically via Redis.

### 🛡️ Rate Limiting
Protects endpoints using sliding-window limits stored in Redis.

---

## 📂 Project Structure

```bash
src/
├── config/           # Database & SDK initialization
├── controllers/      # Request handlers (Posts, Friends, etc.)
├── middlewares/      # Security, Auth, Rate limiters
├── routes/           # Endpoint routing
├── services/         # Third-party integrations
└── utils/            # Caching & utility functions
```

---

## 🔗 Key API Endpoints

### 📱 Posts (`/api/posts`)
- `GET /feed` - Fetch customized user feed.
- `POST /` - Create a post.
- `POST /:postId/like` - Like/Unlike.

### 👥 Friends (`/api/friends`)
- `GET /suggestions` - Fetch AI-powered recommendations.
- `GET /notifications/unread-count` - Atomic badge count.

---

*For full project setup and client instructions, please see the [Main README](file:///d:/Project/Quik/chat-realtime/README.md).*
