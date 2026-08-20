import assert from "node:assert/strict";
import test, { afterEach, mock } from "node:test";

import { sendFriendRequest } from "../../../src/modules/friends/friend.controller.js";
import { friendService } from "../../../src/modules/friends/friend.service.js";
import { createResponseMock } from "../../../test-support/httpMocks.js";

afterEach(() => mock.restoreAll());

test("sendFriendRequest passes authenticated and target user IDs to the service", async () => {
  const send = mock.method(
    friendService,
    "sendFriendRequest",
    async () => ({ requestId: "request-1" }),
  );
  const response = createResponseMock();

  await sendFriendRequest(
    { user: { uid: "user-1" }, body: { toUid: "user-2" } },
    response,
  );

  assert.deepEqual(send.mock.calls[0].arguments, ["user-1", "user-2"]);
  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.body, { success: true, requestId: "request-1" });
});
