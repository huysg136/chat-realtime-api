import assert from "node:assert/strict";
import test, { afterEach, mock } from "node:test";

import { createPost } from "../../../src/modules/posts/post.controller.js";
import { postService } from "../../../src/modules/posts/post.service.js";
import { createResponseMock } from "../../../test-support/httpMocks.js";

afterEach(() => mock.restoreAll());

test("createPost passes authenticated user and post data to the service", async () => {
  const create = mock.method(
    postService,
    "createPost",
    async () => ({ postId: "post-1" }),
  );
  const response = createResponseMock();
  const body = {
    content: "Hello",
    mediaUrl: null,
    kind: "text",
    privacy: "friends",
    fileSize: 0,
  };

  await createPost({ user: { uid: "user-1" }, body }, response);

  assert.deepEqual(create.mock.calls[0].arguments, ["user-1", body]);
  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.body, { success: true, postId: "post-1" });
});
