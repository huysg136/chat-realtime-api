import assert from "node:assert/strict";
import test from "node:test";

import { swaggerDocument } from "../../src/config/swagger.js";

test("Swagger document defines a valid OpenAPI root", () => {
  assert.equal(swaggerDocument.openapi, "3.0.3");
  assert.ok(swaggerDocument.info.title.length > 0);
  assert.ok(swaggerDocument.components.securitySchemes.bearerAuth);
});

test("every documented operation has tags and responses", () => {
  const operations = Object.values(swaggerDocument.paths).flatMap((path) =>
    Object.values(path),
  );

  assert.ok(operations.length > 0);
  for (const operation of operations) {
    assert.ok(operation.tags?.length > 0);
    assert.ok(Object.keys(operation.responses ?? {}).length > 0);
  }
});
