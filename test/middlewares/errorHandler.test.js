import assert from "node:assert/strict";
import test from "node:test";

import {
  globalErrorHandler,
  notFoundHandler,
} from "../../src/middlewares/errorHandler.js";
import { AppError } from "../../src/utils/AppError.js";
import { createResponseMock } from "../../test-support/httpMocks.js";

test("notFoundHandler forwards a 404 AppError", () => {
  const request = { method: "GET", originalUrl: "/missing" };
  let forwardedError;

  notFoundHandler(request, {}, (error) => {
    forwardedError = error;
  });

  assert.ok(forwardedError instanceof AppError);
  assert.equal(forwardedError.statusCode, 404);
  assert.equal(forwardedError.message, "Route not found: GET /missing");
});

test("globalErrorHandler exposes an operational error", () => {
  const response = createResponseMock();

  globalErrorHandler(new AppError("Room not found", 404), {}, response, () => {});

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.body, {
    success: false,
    message: "Room not found",
    error: "Room not found",
  });
});

test("globalErrorHandler hides an unexpected internal error", () => {
  const response = createResponseMock();
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    globalErrorHandler(new Error("database password leaked"), {}, response, () => {});
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(response.statusCode, 500);
  assert.equal(response.body.message, "Internal Server Error");
  assert.equal(response.body.error, "Internal Server Error");
});
