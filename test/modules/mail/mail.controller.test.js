import assert from "node:assert/strict";
import test from "node:test";

import { mailController } from "../../../src/modules/mail/mail.controller.js";
import { AppError } from "../../../src/utils/AppError.js";
import { createResponseMock } from "../../../test-support/httpMocks.js";

test("notifyReportResult forwards a validation error for missing fields", async () => {
  let forwardedError;

  await mailController.notifyReportResult(
    { body: {} },
    createResponseMock(),
    (error) => { forwardedError = error; },
  );

  assert.ok(forwardedError instanceof AppError);
  assert.equal(forwardedError.statusCode, 400);
  assert.equal(forwardedError.message, "Missing required fields");
});
