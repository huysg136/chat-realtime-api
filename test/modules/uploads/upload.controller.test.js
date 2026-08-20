import assert from "node:assert/strict";
import test from "node:test";

import { uploadController } from "../../../src/modules/uploads/upload.controller.js";
import { AppError } from "../../../src/utils/AppError.js";
import { createResponseMock } from "../../../test-support/httpMocks.js";

test("getUploadUrl rejects a missing file size before querying Firestore", async () => {
  let forwardedError;

  await uploadController.getUploadUrl(
    {
      user: { uid: "user-1" },
      body: { fileName: "photo.png", fileType: "image/png" },
    },
    createResponseMock(),
    (error) => { forwardedError = error; },
  );

  assert.ok(forwardedError instanceof AppError);
  assert.equal(forwardedError.statusCode, 400);
  assert.equal(forwardedError.message, "Missing fileSize");
});
