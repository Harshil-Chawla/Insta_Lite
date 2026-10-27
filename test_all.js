const assert = require("node:assert/strict");
const prisma = require("./src/db");
const app = require("./src/app");

async function runTests() {
  const server = app.listen(3001);
  const baseUrl = "http://localhost:3001";

  try {
    console.log("Cleaning database...");
    await prisma.post.deleteMany();
    await prisma.user.deleteMany();

    console.log("\n--- Testing Step 01: Health Check ---");
    let res = await fetch(`${baseUrl}/health`);
    let data = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(data, { status: "OK" });
    assert.equal(res.headers.get("content-type").includes("application/json"), true);
    console.log("✅ GET /health passed:", data);

    console.log("\n--- Testing Step 04: POST /users ---");
    // # 1
    res = await fetch(`${baseUrl}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "riya_travels",
        email: "riya@example.com",
        fullname: "Riya Sharma",
      }),
    });
    data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.username, "riya_travels");
    assert.equal(data.email, "riya@example.com");
    assert.equal(data.fullname, "Riya Sharma");
    assert.equal(data.bio, null);
    assert.equal(data.isPrivate, false);
    assert.ok(data.id);
    assert.ok(data.createdAt);
    assert.ok(data.updatedAt);
    const riyaId = data.id;
    console.log("✅ Test 1 (Create user): 201 Created passed with ID", riyaId);

    // # 2
    res = await fetch(`${baseUrl}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "riya_travels",
        email: "other@example.com",
        fullname: "Copy Cat",
      }),
    });
    data = await res.json();
    assert.equal(res.status, 409);
    assert.deepEqual(data, { error: "username or email already taken" });
    console.log("✅ Test 2 (Duplicate username): 409 Conflict passed");

    // # 3
    res = await fetch(`${baseUrl}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "onlyname",
      }),
    });
    data = await res.json();
    assert.equal(res.status, 400);
    assert.deepEqual(data, { error: "username, email and fullname are required" });
    console.log("✅ Test 3 (Missing fields): 400 Bad Request passed");

    // # 4
    res = await fetch(`${baseUrl}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "sneaky",
        email: "sneaky@example.com",
        fullname: "Sneaky",
        id: 999,
      }),
    });
    data = await res.json();
    assert.equal(res.status, 201);
    assert.notEqual(data.id, 999);
    const sneakyId = data.id;
    console.log("✅ Test 4 (Ignored id): 201 Created passed with ID", sneakyId);

    console.log("\n--- Testing Step 05: GET /users ---");
    res = await fetch(`${baseUrl}/users`);
    data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(Array.isArray(data), true);
    assert.equal(data.length, 2);
    console.log("✅ GET /users passed: Found", data.length, "users");

    console.log("\n--- Testing Step 06: GET /users/:id ---");
    res = await fetch(`${baseUrl}/users/${riyaId}`);
    data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.username, "riya_travels");
    console.log("✅ GET /users/:id (existing): 200 OK passed");

    res = await fetch(`${baseUrl}/users/99999`);
    data = await res.json();
    assert.equal(res.status, 404);
    assert.deepEqual(data, { error: "User not found" });
    console.log("✅ GET /users/:id (non-existing): 404 Not Found passed");

    console.log("\n--- Testing Step 07: PATCH /users/:id ---");
    res = await fetch(`${baseUrl}/users/${riyaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullname: "Riya Sharma Updated",
        bio: "Exploring the world",
        isPrivate: true,
        username: "should_be_ignored",
        email: "ignored@example.com",
      }),
    });
    data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.fullname, "Riya Sharma Updated");
    assert.equal(data.bio, "Exploring the world");
    assert.equal(data.isPrivate, true);
    assert.equal(data.username, "riya_travels");
    assert.equal(data.email, "riya@example.com");
    console.log("✅ PATCH /users/:id (existing): 200 OK passed (uneditable fields ignored)");

    res = await fetch(`${baseUrl}/users/99999`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullname: "Ghost" }),
    });
    data = await res.json();
    assert.equal(res.status, 404);
    assert.deepEqual(data, { error: "User not found" });
    console.log("✅ PATCH /users/:id (non-existing): 404 Not Found passed");

    console.log("\n--- Testing Step 08: DELETE /users/:id ---");
    res = await fetch(`${baseUrl}/users/${sneakyId}`, {
      method: "DELETE",
    });
    assert.equal(res.status, 204);
    console.log("✅ DELETE /users/:id (existing): 204 No Content passed");

    res = await fetch(`${baseUrl}/users/99999`, {
      method: "DELETE",
    });
    data = await res.json();
    assert.equal(res.status, 404);
    assert.deepEqual(data, { error: "User not found" });
    console.log("✅ DELETE /users/:id (non-existing): 404 Not Found passed");

    console.log("\n--- Testing Step 13: POST /posts ---");
    // Missing imageUrl
    res = await fetch(`${baseUrl}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: "No image" }),
    });
    data = await res.json();
    assert.equal(res.status, 400);
    assert.deepEqual(data, { error: "imageUrl is required" });
    console.log("✅ POST /posts (missing imageUrl): 400 Bad Request passed");

    // Success
    res = await fetch(`${baseUrl}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: "https://example.com/sunset.jpg",
        caption: "Beautiful sunset",
        location: "Goa, India",
        id: 888,
      }),
    });
    data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.imageUrl, "https://example.com/sunset.jpg");
    assert.equal(data.caption, "Beautiful sunset");
    assert.equal(data.location, "Goa, India");
    assert.notEqual(data.id, 888);
    const postId = data.id;
    console.log("✅ POST /posts (success): 201 Created passed with ID", postId);

    console.log("\n--- Testing Step 14: GET /posts ---");
    res = await fetch(`${baseUrl}/posts`);
    data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(Array.isArray(data), true);
    assert.equal(data.length, 1);
    console.log("✅ GET /posts passed: Found", data.length, "posts");

    console.log("\n--- Testing Step 15: GET /posts/:id ---");
    res = await fetch(`${baseUrl}/posts/${postId}`);
    data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.imageUrl, "https://example.com/sunset.jpg");
    console.log("✅ GET /posts/:id (existing): 200 OK passed");

    res = await fetch(`${baseUrl}/posts/99999`);
    data = await res.json();
    assert.equal(res.status, 404);
    assert.deepEqual(data, { error: "Post not found" });
    console.log("✅ GET /posts/:id (non-existing): 404 Not Found passed");

    console.log("\n--- Testing Step 16: PATCH /posts/:id ---");
    res = await fetch(`${baseUrl}/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caption: "Updated sunset caption",
        location: "North Goa",
        imageUrl: "https://example.com/should_not_change.jpg",
      }),
    });
    data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.caption, "Updated sunset caption");
    assert.equal(data.location, "North Goa");
    assert.equal(data.imageUrl, "https://example.com/sunset.jpg");
    console.log("✅ PATCH /posts/:id (existing): 200 OK passed (imageUrl unchanged)");

    res = await fetch(`${baseUrl}/posts/99999`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: "Ghost post" }),
    });
    data = await res.json();
    assert.equal(res.status, 404);
    assert.deepEqual(data, { error: "Post not found" });
    console.log("✅ PATCH /posts/:id (non-existing): 404 Not Found passed");

    console.log("\n--- Testing Step 17: DELETE /posts/:id ---");
    res = await fetch(`${baseUrl}/posts/${postId}`, {
      method: "DELETE",
    });
    assert.equal(res.status, 204);
    console.log("✅ DELETE /posts/:id (existing): 204 No Content passed");

    res = await fetch(`${baseUrl}/posts/99999`, {
      method: "DELETE",
    });
    data = await res.json();
    assert.equal(res.status, 404);
    assert.deepEqual(data, { error: "Post not found" });
    console.log("✅ DELETE /posts/:id (non-existing): 404 Not Found passed");

    console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉\n");
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
