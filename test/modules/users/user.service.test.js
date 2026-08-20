import assert from "node:assert/strict";
import test from "node:test";

import { getUserData } from "../../../src/modules/users/user.service.js";

test("getUserData returns null without querying dependencies when uid is missing", async () => {
  assert.equal(await getUserData(), null);
  assert.equal(await getUserData(""), null);
});
