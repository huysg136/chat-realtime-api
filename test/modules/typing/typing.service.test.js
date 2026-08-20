import assert from "node:assert/strict";
import test, { mock } from "node:test";

import { createTypingService } from "../../../src/modules/typing/typing.service.js";

const createRedisMock = () => ({
  zadd: mock.fn(async () => 1),
  zrem: mock.fn(async () => 1),
  zremrangebyscore: mock.fn(async () => 0),
  zrange: mock.fn(async () => []),
});

test("startTyping stores the user with the current timestamp", async () => {
  const redis = createRedisMock();
  const typingService = createTypingService(redis);
  const before = Date.now();

  const result = await typingService.startTyping({ roomId: "room-1", uid: "user-1" });

  const after = Date.now();
  assert.equal(redis.zadd.mock.callCount(), 1);
  const [key, value] = redis.zadd.mock.calls[0].arguments;
  assert.equal(key, "typing:room-1");
  assert.equal(value.member, "user-1");
  assert.ok(value.score >= before && value.score <= after);
  assert.deepEqual(result, { roomId: "room-1", uid: "user-1", status: "start" });
});

test("stopTyping removes the user from the room", async () => {
  const redis = createRedisMock();
  const typingService = createTypingService(redis);

  const result = await typingService.stopTyping({ roomId: "room-1", uid: "user-1" });

  assert.deepEqual(redis.zrem.mock.calls[0].arguments, ["typing:room-1", "user-1"]);
  assert.deepEqual(result, { roomId: "room-1", uid: "user-1", status: "stop" });
});

test("getTypingUsers removes expired entries and excludes the current user", async () => {
  const redis = createRedisMock();
  redis.zrange = mock.fn(async () => ["me", "user-2"]);
  const typingService = createTypingService(redis);

  const result = await typingService.getTypingUsers({
    roomId: "room-1",
    excludeUid: "me",
  });

  assert.equal(redis.zremrangebyscore.mock.calls[0].arguments[0], "typing:room-1");
  assert.equal(redis.zrange.mock.calls[0].arguments[0], "typing:room-1");
  assert.equal(redis.zrange.mock.calls[0].arguments[2], "+inf");
  assert.deepEqual(redis.zrange.mock.calls[0].arguments[3], { byScore: true });
  assert.deepEqual(result, ["user-2"]);
});
