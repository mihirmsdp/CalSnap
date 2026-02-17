import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../index.js";

test("GET /health returns ok", async () => {
  const response = await request(app).get("/health");
  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(typeof response.body.now, "string");
});

test("POST /api/analyze-food returns 400 when image is missing", async () => {
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = previous || "test-key";
  const response = await request(app).post("/api/analyze-food").send({});
  assert.equal(response.status, 400);
  assert.equal(response.body.error, "image is required");
  process.env.GEMINI_API_KEY = previous;
});

test("POST /api/analyze-food returns 500 when api key is missing", async () => {
  const previous = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  const response = await request(app).post("/api/analyze-food").send({ image: "abc", mimeType: "image/jpeg" });
  assert.equal(response.status, 500);
  assert.equal(response.body.error, "Missing GEMINI_API_KEY");
  process.env.GEMINI_API_KEY = previous;
});
