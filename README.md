# ⚡ Quik Backend API

[![Node.js](https://img.shields.io/badge/Node.js-18-green?logo=node.js&logoColor=white)]
[![Express](https://img.shields.io/badge/Express-5.0-black?logo=express&logoColor=white)]
[![Stringee](https://img.shields.io/badge/Stringee-Video%20Call-red)]
[![Cloudflare R2](https://img.shields.io/badge/Cloudflare-R2_Storage-orange?logo=cloudflare&logoColor=white)]
[![AI](https://img.shields.io/badge/AI-Gemini%20%26%20Llama-blue?logo=google-gemini&logoColor=white)]

The robust **Node.js backend** for the **Quik Real-Time Chat Application**. It powers high-performance video calls, fast file storage, smart AI assistants, and automated reporting systems.

Built with a **Clean, Modular Architecture** for scalability and maintainability.

---

## 🚀 Features

- **📹 Video Call Orchestration**: Secure token generation and room management using **Stringee SDK**.
- **☁️ High-Speed Storage**: Presigned URL uploads to **Cloudflare R2** (S3 compatible) for lightning-fast media sharing.
- **🤖 Smart AI Assistant**: Integration with **Groq (Llama 3)** and **Google Gemini 2.5** for intelligent chat responses.
- **📧 Automated Reporting**: Email notification system for content moderation using **Resend**.
- **🏗 Modular Architecture**: Organized into Feature-based modules (Controller-Service pattern).
- **🛡️ Secure & Robust**: Centralized error handling and configuration management.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Real-Time Communication**: Stringee SDK (Video/Voice)
- **Object Storage**: AWS SDK v3 (for Cloudflare R2)
- **AI Models**: 
    - Google Gemini 2.5 Flash Lite
    - Groq (Llama 3.1 8b Instant)
- **Email Service**: Resend
- **Architecture**: Modular Feature-based design

---

## 📂 Project Structure

```bash
src/
├── AI/               # AI Services & Large Language Models
│   ├── geminiService.js   # Google Gemini for text refinement
│   └── groqService.js     # Llama 3 for chatbot responses
├── Config/           # Centralized Env & Security Validation
├── Controllers/      # Request Handling Logic
├── Exception/        # Global Error & Panic Handling Middleware
├── Reports/          # Resend Email Notification System
├── Routes/           # API Endpoint Definitions
├── Services/         # Modular Business Logic (Media, etc.)
├── Stringee/         # VoIP Signaling & JWT Token Logic
└── Upload/           # Cloudflare R2 / S3 Storage Logic
server.js             # Application Entry Point
```


## 🔗 API Overview

| Feature | Endpoint | Method | Description |
|:---|:---|:---:|:---|
| **Stringee** | `/api/stringee/token` | `GET` | Get client access token |
| | `/api/stringee/create-room` | `POST` | Create a new video room |
| **Upload** | `/api/get-upload-url` | `POST` | Get presigned URL for R2 upload |
| **AI** | `/api/ask-groq` | `POST` | Chat with Llama 3 via Groq |
| | `/api/ask-gemini` | `POST` | Chat with Gemini 2.5 |
| **Reports** | `/api/reports/notify` | `POST` | Send report decision email |

---

Made with ❤️ for **Quik**.
