const bearerSecurity = [{ bearerAuth: [] }];

const jsonContent = (schema) => ({
  "application/json": { schema },
});

const requestBody = (properties, required = []) => ({
  required: true,
  content: jsonContent({ type: "object", properties, required }),
});

const successResponse = (description = "Success") => ({ description });

const errorResponses = {
  400: { description: "Invalid request" },
  401: { description: "Missing or invalid Firebase token" },
  403: { description: "Forbidden" },
  404: { description: "Resource not found" },
  429: { description: "Too many requests" },
  500: { description: "Internal server error" },
};

export const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "Quik API",
    version: "1.0.0",
    description: "HTTP API for Quik chat, social, uploads, AI and calling features.",
  },
  servers: [{ url: "/", description: "Current server" }],
  tags: [
    { name: "AI" },
    { name: "Friends" },
    { name: "Mail" },
    { name: "Posts" },
    { name: "Stringee" },
    { name: "Typing" },
    { name: "Uploads" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "Firebase ID token",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string" },
          error: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/api/ask-groq": {
      post: {
        tags: ["AI"], security: bearerSecurity, summary: "Ask Groq",
        requestBody: requestBody({ prompt: { type: "string", maxLength: 10000 } }, ["prompt"]),
        responses: { 200: successResponse(), ...errorResponses },
      },
    },
    "/api/ask-gemini": {
      post: {
        tags: ["AI"], security: bearerSecurity, summary: "Ask Gemini",
        requestBody: requestBody({ prompt: { type: "string", maxLength: 10000 } }, ["prompt"]),
        responses: { 200: successResponse(), ...errorResponses },
      },
    },
    "/api/list-models": {
      get: { tags: ["AI"], security: bearerSecurity, summary: "List Gemini models", responses: { 200: successResponse(), ...errorResponses } },
    },
    "/api/friends/suggestions": {
      get: { tags: ["Friends"], security: bearerSecurity, summary: "Get friend suggestions", responses: { 200: successResponse(), ...errorResponses } },
    },
    "/api/friends/notifications/unread-count": {
      get: { tags: ["Friends"], security: bearerSecurity, summary: "Get unread notification count", responses: { 200: successResponse(), ...errorResponses } },
    },
    "/api/friends/notifications/{notificationId}/read": {
      patch: {
        tags: ["Friends"], security: bearerSecurity, summary: "Mark a notification as read",
        parameters: [{ in: "path", name: "notificationId", required: true, schema: { type: "string" } }],
        responses: { 200: successResponse(), ...errorResponses },
      },
    },
    "/api/friends/notifications/read-all": {
      post: { tags: ["Friends"], security: bearerSecurity, summary: "Mark all notifications as read", responses: { 200: successResponse(), ...errorResponses } },
    },
    "/api/friends/request": {
      post: {
        tags: ["Friends"], security: bearerSecurity, summary: "Send a friend request",
        requestBody: requestBody({ toUid: { type: "string" } }, ["toUid"]),
        responses: { 201: successResponse("Created"), ...errorResponses },
      },
    },
    "/api/friends/accept": {
      post: {
        tags: ["Friends"], security: bearerSecurity, summary: "Accept a friend request",
        requestBody: requestBody({ requestId: { type: "string" }, fromUid: { type: "string" } }, ["requestId", "fromUid"]),
        responses: { 200: successResponse(), ...errorResponses },
      },
    },
    "/api/friends/reject": {
      post: {
        tags: ["Friends"], security: bearerSecurity, summary: "Reject a friend request",
        requestBody: requestBody({ requestId: { type: "string" } }, ["requestId"]),
        responses: { 200: successResponse(), ...errorResponses },
      },
    },
    "/api/friends/cancel": {
      post: {
        tags: ["Friends"], security: bearerSecurity, summary: "Cancel a friend request",
        requestBody: requestBody({ toUid: { type: "string" } }, ["toUid"]),
        responses: { 200: successResponse(), ...errorResponses },
      },
    },
    "/api/friends/unfriend": {
      post: {
        tags: ["Friends"], security: bearerSecurity, summary: "Remove a friend",
        requestBody: requestBody({ targetUid: { type: "string" } }, ["targetUid"]),
        responses: { 200: successResponse(), ...errorResponses },
      },
    },
    "/api/mail/notify-report": {
      post: {
        tags: ["Mail"], security: bearerSecurity, summary: "Send report-result email",
        requestBody: requestBody({ reporterEmail: { type: "string", format: "email" }, reporterName: { type: "string" }, messageText: { type: "string" }, action: { type: "string" }, adminName: { type: "string" }, reason: { type: "string" } }, ["reporterEmail", "reporterName", "action"]),
        responses: { 200: successResponse(), ...errorResponses },
      },
    },
    "/api/mail/notify-new-user": {
      post: {
        tags: ["Mail"], security: bearerSecurity, summary: "Send new-user notification email",
        requestBody: requestBody({ displayName: { type: "string" }, email: { type: "string", format: "email" }, uid: { type: "string" }, username: { type: "string" }, photoURL: { type: "string", format: "uri" } }),
        responses: { 200: successResponse(), ...errorResponses },
      },
    },
    "/api/posts/feed": {
      get: {
        tags: ["Posts"], security: bearerSecurity, summary: "Get the post feed",
        parameters: [
          { in: "query", name: "filterUserId", schema: { type: "string" } },
          { in: "query", name: "searchQuery", schema: { type: "string" } },
          { in: "query", name: "lastCreatedAt", schema: { type: "integer", format: "int64" } },
          { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 50 } },
        ],
        responses: { 200: successResponse(), ...errorResponses },
      },
    },
    "/api/posts/feed/check-new": {
      get: {
        tags: ["Posts"], security: bearerSecurity, summary: "Count new posts",
        parameters: [{ in: "query", name: "since", required: true, schema: { type: "integer", format: "int64" } }],
        responses: { 200: successResponse(), ...errorResponses },
      },
    },
    "/api/posts": {
      post: {
        tags: ["Posts"], security: bearerSecurity, summary: "Create a post",
        requestBody: requestBody({ content: { type: "string" }, mediaUrl: { type: "string" }, kind: { type: "string" }, privacy: { type: "string", enum: ["public", "friends", "private"] }, fileSize: { type: "integer" } }),
        responses: { 201: successResponse("Created"), ...errorResponses },
      },
    },
    "/api/posts/{postId}": {
      put: {
        tags: ["Posts"], security: bearerSecurity, summary: "Update a post",
        parameters: [{ in: "path", name: "postId", required: true, schema: { type: "string" } }],
        requestBody: requestBody({ content: { type: "string" }, mediaUrl: { type: "string" }, kind: { type: "string" }, privacy: { type: "string" }, fileSize: { type: "integer" } }),
        responses: { 200: successResponse(), ...errorResponses },
      },
      delete: {
        tags: ["Posts"], security: bearerSecurity, summary: "Delete a post",
        parameters: [{ in: "path", name: "postId", required: true, schema: { type: "string" } }],
        responses: { 200: successResponse(), ...errorResponses },
      },
    },
    "/api/posts/{postId}/like": {
      post: {
        tags: ["Posts"], security: bearerSecurity, summary: "Toggle post like",
        parameters: [{ in: "path", name: "postId", required: true, schema: { type: "string" } }],
        responses: { 200: successResponse(), ...errorResponses },
      },
    },
    "/api/posts/{postId}/comment": {
      post: {
        tags: ["Posts"], security: bearerSecurity, summary: "Create a comment",
        parameters: [{ in: "path", name: "postId", required: true, schema: { type: "string" } }],
        requestBody: requestBody({ content: { type: "string" }, parentId: { type: "string" }, replyToUid: { type: "string" }, replyToName: { type: "string" }, postAuthorUid: { type: "string" } }, ["content"]),
        responses: { 201: successResponse("Created"), ...errorResponses },
      },
    },
    "/api/posts/{postId}/comment/{commentId}": {
      delete: {
        tags: ["Posts"], security: bearerSecurity, summary: "Delete a comment",
        parameters: [
          { in: "path", name: "postId", required: true, schema: { type: "string" } },
          { in: "path", name: "commentId", required: true, schema: { type: "string" } },
        ],
        responses: { 200: successResponse(), ...errorResponses },
      },
    },
    "/api/posts/{postId}/comment/{commentId}/like": {
      post: {
        tags: ["Posts"], security: bearerSecurity, summary: "Toggle comment like",
        parameters: [
          { in: "path", name: "postId", required: true, schema: { type: "string" } },
          { in: "path", name: "commentId", required: true, schema: { type: "string" } },
        ],
        responses: { 200: successResponse(), ...errorResponses },
      },
    },
    "/api/stringee/token": {
      get: { tags: ["Stringee"], security: bearerSecurity, summary: "Create a Stringee client token", responses: { 200: successResponse(), ...errorResponses } },
    },
    "/api/stringee/rest-token": {
      post: { tags: ["Stringee"], security: bearerSecurity, summary: "Create a Stringee REST token", responses: { 200: successResponse(), ...errorResponses } },
    },
    "/api/stringee/create-room": {
      post: {
        tags: ["Stringee"], security: bearerSecurity, summary: "Create a video room",
        requestBody: requestBody({ roomName: { type: "string" } }, ["roomName"]),
        responses: { 200: successResponse(), ...errorResponses },
      },
    },
    "/api/stringee/generate-room-token": {
      post: {
        tags: ["Stringee"], security: bearerSecurity, summary: "Create a room token",
        requestBody: requestBody({ roomId: { type: "string" } }, ["roomId"]),
        responses: { 200: successResponse(), ...errorResponses },
      },
    },
    "/api/stringee/list-rooms": {
      get: { tags: ["Stringee"], security: bearerSecurity, summary: "List video rooms", responses: { 200: successResponse(), ...errorResponses } },
    },
    "/api/typing": {
      get: {
        tags: ["Typing"], security: bearerSecurity, summary: "Get users currently typing",
        parameters: [{ in: "query", name: "roomId", required: true, schema: { type: "string" } }],
        responses: { 200: successResponse(), ...errorResponses },
      },
      post: {
        tags: ["Typing"], security: bearerSecurity, summary: "Update typing status",
        requestBody: requestBody({ roomId: { type: "string" }, action: { type: "string", enum: ["start", "stop"] } }, ["roomId", "action"]),
        responses: { 200: successResponse(), ...errorResponses },
      },
    },
    "/api/get-upload-url": {
      post: {
        tags: ["Uploads"], security: bearerSecurity, summary: "Create an R2 presigned upload URL",
        requestBody: requestBody({ fileName: { type: "string" }, fileType: { type: "string" }, folder: { type: "string" }, fileSize: { type: "integer", minimum: 1 } }, ["fileName", "fileType", "fileSize"]),
        responses: { 200: successResponse(), ...errorResponses },
      },
    },
    "/upload": {
      post: {
        tags: ["Uploads"], security: bearerSecurity, summary: "Upload a file through the API",
        requestBody: {
          required: true,
          content: { "multipart/form-data": { schema: { type: "object", properties: { file: { type: "string", format: "binary" } }, required: ["file"] } } },
        },
        responses: { 200: successResponse(), ...errorResponses },
      },
    },
  },
};
