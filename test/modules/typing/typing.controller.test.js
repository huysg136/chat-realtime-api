import assert from "node:assert/strict";
import test, { afterEach, mock } from "node:test";

import { typingController } from "../../../src/modules/typing/typing.controller.js";
import { typingService } from "../../../src/modules/typing/typing.service.js";
import { AppError } from "../../../src/utils/AppError.js";
import { createResponseMock } from "../../../test-support/httpMocks.js";

afterEach(() => mock.restoreAll());

test("updateTyping rejects an invalid action", async () => {
  const request = {
    user: { uid: "user-1" },
    body: { roomId: "room-1", action: "invalid" },
  };

  await assert.rejects(
    typingController.updateTyping(request, createResponseMock()),
    (error) => error instanceof AppError && error.statusCode === 400,
  );
});

test("updateTyping delegates a start action to the service", async () => {
  const expected = { roomId: "room-1", uid: "user-1", status: "start" };
  const startTyping = mock.method(typingService, "startTyping", async () => expected);
  const response = createResponseMock();

  await typingController.updateTyping(
    {
      user: { uid: "user-1" },
      body: { roomId: "room-1", action: "start" },
    },
    response,
  );

  assert.deepEqual(startTyping.mock.calls[0].arguments, [
    { roomId: "room-1", uid: "user-1" },
  ]);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { ok: true, data: expected });
});

test("getTypingUsers excludes the authenticated user", async () => {
  const getTypingUsers = mock.method(
    typingService,
    "getTypingUsers",
    async () => ["user-2"],
  );
  const response = createResponseMock();

  await typingController.getTypingUsers(
    { user: { uid: "user-1" }, query: { roomId: "room-1" } },
    response,
  );

  assert.deepEqual(getTypingUsers.mock.calls[0].arguments, [
    { roomId: "room-1", excludeUid: "user-1" },
  ]);
  assert.deepEqual(response.body, { ok: true, typingUids: ["user-2"] });
});
