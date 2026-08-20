import assert from "node:assert/strict";
import test from "node:test";

import { aiController } from "../../../src/modules/ai/ai.controller.js";
import { createResponseMock } from "../../../test-support/httpMocks.js";

test("askGroq rejects an empty prompt without calling the AI provider", async () => {
  const response = createResponseMock();
  let forwardedError;

  await aiController.askGroq(
    { body: { prompt: "   " } },
    response,
    (error) => { forwardedError = error; },
  );

  assert.equal(forwardedError, undefined);
  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    success: false,
    message: "prompt is required",
  });
});
