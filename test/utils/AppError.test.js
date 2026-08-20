import assert from "node:assert/strict";
import test from "node:test";

import { AppError } from "../../src/utils/AppError.js";

test("AppError stores operational error metadata", () => {
  const error = new AppError("Invalid request", 400);

  assert.equal(error.name, "AppError");
  assert.equal(error.message, "Invalid request");
  assert.equal(error.statusCode, 400);
  assert.equal(error.isOperational, true);
  assert.ok(error instanceof Error);
});
