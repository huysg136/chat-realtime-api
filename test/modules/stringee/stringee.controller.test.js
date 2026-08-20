import assert from "node:assert/strict";
import test, { afterEach, mock } from "node:test";

import { stringeeController } from "../../../src/modules/stringee/stringee.controller.js";
import { stringeeService } from "../../../src/modules/stringee/stringee.service.js";
import { createResponseMock } from "../../../test-support/httpMocks.js";

afterEach(() => mock.restoreAll());

test("getClientToken creates a token for the authenticated user", () => {
  const generate = mock.method(
    stringeeService,
    "generateClientToken",
    () => ({ token: "signed-token", expiresIn: 3600 }),
  );
  const response = createResponseMock();

  stringeeController.getClientToken(
    { user: { uid: "user-1" } },
    response,
    () => {},
  );

  assert.deepEqual(generate.mock.calls[0].arguments, ["user-1"]);
  assert.deepEqual(response.body, {
    access_token: "signed-token",
    expires_in: 3600,
    userId: "user-1",
  });
});
