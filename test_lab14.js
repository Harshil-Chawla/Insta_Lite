const assert = require("node:assert/strict");
const prisma = require("./src/db");
const app = require("./src/app");
const { execSync } = require("node:child_process");

function getInstaId(url) {
  const m = url.match(/insta\d+/);
  return m ? m[0] : url;
}

async function runTests() {
  console.log("Seeding database via npm run seed...");
  execSync("npm run seed", { stdio: "inherit" });

  const server = app.listen(3002);
  const baseUrl = "http://localhost:3002";

  try {
    console.log("\n================ Step 04: Pagination on GET /users ================");
    // # 1
    let res = await fetch(`${baseUrl}/users`);
    let json = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(json.meta, { page: 1, limit: 10, total: 12, totalPages: 2 });
    assert.equal(json.data.length, 10);
    assert.equal(json.data[0].username, "dev_shoots");
    assert.equal(json.data[1].username, "isha_dances");
    assert.equal(json.data[2].username, "aditya_codes");
    assert.equal(json.data[9].username, "meera.eats");
    console.log("✅ Step 04 - Test 1 passed");

    // # 2
    res = await fetch(`${baseUrl}/users?page=2`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(json.meta, { page: 2, limit: 10, total: 12, totalPages: 2 });
    assert.deepEqual(json.data.map(u => u.username), ["arjun_clicks", "riya_travels"]);
    console.log("✅ Step 04 - Test 2 passed");

    // # 3
    res = await fetch(`${baseUrl}/users?page=3&limit=5`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(json.meta, { page: 3, limit: 5, total: 12, totalPages: 3 });
    assert.deepEqual(json.data.map(u => u.username), ["arjun_clicks", "riya_travels"]);
    console.log("✅ Step 04 - Test 3 passed");

    // # 4
    res = await fetch(`${baseUrl}/users?limit=100`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(json.meta, { page: 1, limit: 50, total: 12, totalPages: 1 });
    assert.equal(json.data.length, 12);
    console.log("✅ Step 04 - Test 4 passed");

    // # 5
    res = await fetch(`${baseUrl}/users?page=5`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(json.meta, { page: 5, limit: 10, total: 12, totalPages: 2 });
    assert.deepEqual(json.data, []);
    console.log("✅ Step 04 - Test 5 passed");

    // # 6
    res = await fetch(`${baseUrl}/users?page=0`);
    json = await res.json();
    assert.equal(res.status, 400);
    assert.deepEqual(json, { error: "page and limit must be positive integers" });
    console.log("✅ Step 04 - Test 6 passed");

    // # 7
    res = await fetch(`${baseUrl}/users?limit=abc`);
    json = await res.json();
    assert.equal(res.status, 400);
    assert.deepEqual(json, { error: "page and limit must be positive integers" });
    console.log("✅ Step 04 - Test 7 passed");

    // # 8
    res = await fetch(`${baseUrl}/users?page=1.5`);
    json = await res.json();
    assert.equal(res.status, 400);
    assert.deepEqual(json, { error: "page and limit must be positive integers" });
    console.log("✅ Step 04 - Test 8 passed");

    console.log("\n================ Step 05: Sorting on GET /users ================");
    // # 1
    res = await fetch(`${baseUrl}/users?sortBy=username&order=asc`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.meta.total, 12);
    assert.equal(json.meta.totalPages, 2);
    assert.equal(json.data[0].username, "aditya_codes");
    assert.equal(json.data[1].username, "ananya_reads");
    assert.equal(json.data[2].username, "arjun_clicks");
    console.log("✅ Step 05 - Test 1 passed");

    // # 2
    res = await fetch(`${baseUrl}/users?sortBy=fullname&order=desc&limit=3`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.meta.total, 12);
    assert.equal(json.meta.totalPages, 4);
    assert.deepEqual(json.data.map(u => u.username), ["vikram.trek", "sara_sketches", "rohan_runs"]);
    console.log("✅ Step 05 - Test 2 passed");

    // # 3
    res = await fetch(`${baseUrl}/users?order=asc&limit=2`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.meta.total, 12);
    assert.equal(json.meta.totalPages, 6);
    assert.deepEqual(json.data.map(u => u.username), ["riya_travels", "arjun_clicks"]);
    console.log("✅ Step 05 - Test 3 passed");

    // # 4
    res = await fetch(`${baseUrl}/users?sortBy=email`);
    json = await res.json();
    assert.equal(res.status, 400);
    assert.deepEqual(json, { error: "sortBy must be one of: createdAt, username, fullname" });
    console.log("✅ Step 05 - Test 4 passed");

    // # 5
    res = await fetch(`${baseUrl}/users?order=sideways`);
    json = await res.json();
    assert.equal(res.status, 400);
    assert.deepEqual(json, { error: "order must be asc or desc" });
    console.log("✅ Step 05 - Test 5 passed");

    console.log("\n================ Step 06: Filtering on GET /users ================");
    // # 1
    res = await fetch(`${baseUrl}/users?isPrivate=true`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.meta.total, 4);
    assert.equal(json.meta.totalPages, 1);
    assert.deepEqual(json.data.map(u => u.username), ["dev_shoots", "neha_designs", "ananya_reads", "meera.eats"]);
    console.log("✅ Step 06 - Test 1 passed");

    // # 2
    res = await fetch(`${baseUrl}/users?isPrivate=false`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.meta.total, 8);
    assert.equal(json.meta.totalPages, 1);
    assert.equal(json.data[0].username, "isha_dances");
    assert.equal(json.data[1].username, "aditya_codes");
    console.log("✅ Step 06 - Test 2 passed");

    // # 3
    res = await fetch(`${baseUrl}/users?search=sh`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.meta.total, 3);
    assert.equal(json.meta.totalPages, 1);
    assert.deepEqual(json.data.map(u => u.username), ["dev_shoots", "isha_dances", "riya_travels"]);
    console.log("✅ Step 06 - Test 3 passed");

    // # 4
    res = await fetch(`${baseUrl}/users?search=SH&isPrivate=false&sortBy=fullname&order=asc&limit=2`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.meta.total, 2);
    assert.equal(json.meta.totalPages, 1);
    assert.deepEqual(json.data.map(u => u.username), ["isha_dances", "riya_travels"]);
    console.log("✅ Step 06 - Test 4 passed");

    // # 5
    res = await fetch(`${baseUrl}/users?search=zzz`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.meta.total, 0);
    assert.equal(json.meta.totalPages, 0);
    assert.deepEqual(json.data, []);
    console.log("✅ Step 06 - Test 5 passed");

    // # 6
    res = await fetch(`${baseUrl}/users?isPrivate=maybe`);
    json = await res.json();
    assert.equal(res.status, 400);
    assert.deepEqual(json, { error: "isPrivate must be true or false" });
    console.log("✅ Step 06 - Test 6 passed");

    console.log("\n================ Step 07: Pagination & sorting on GET /posts ================");
    // # 1
    res = await fetch(`${baseUrl}/posts`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(json.meta, { page: 1, limit: 10, total: 24, totalPages: 3 });
    assert.equal(json.data.length, 10);
    assert.equal(getInstaId(json.data[0].imageUrl), "insta24");
    assert.equal(getInstaId(json.data[1].imageUrl), "insta23");
    assert.equal(getInstaId(json.data[9].imageUrl), "insta15");
    console.log("✅ Step 07 - Test 1 passed");

    // # 2
    res = await fetch(`${baseUrl}/posts?page=3`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(json.meta, { page: 3, limit: 10, total: 24, totalPages: 3 });
    assert.deepEqual(json.data.map(p => getInstaId(p.imageUrl)), ["insta04", "insta03", "insta02", "insta01"]);
    console.log("✅ Step 07 - Test 2 passed");

    // # 3
    res = await fetch(`${baseUrl}/posts?page=4`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(json.meta, { page: 4, limit: 10, total: 24, totalPages: 3 });
    assert.deepEqual(json.data, []);
    console.log("✅ Step 07 - Test 3 passed");

    // # 4
    res = await fetch(`${baseUrl}/posts?order=asc&limit=3`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(json.meta, { page: 1, limit: 3, total: 24, totalPages: 8 });
    assert.deepEqual(json.data.map(p => getInstaId(p.imageUrl)), ["insta01", "insta02", "insta03"]);
    console.log("✅ Step 07 - Test 4 passed");

    // # 5
    res = await fetch(`${baseUrl}/posts?limit=0`);
    json = await res.json();
    assert.equal(res.status, 400);
    assert.deepEqual(json, { error: "page and limit must be positive integers" });
    console.log("✅ Step 07 - Test 5 passed");

    // # 6
    res = await fetch(`${baseUrl}/posts?sortBy=caption`);
    json = await res.json();
    assert.equal(res.status, 400);
    assert.deepEqual(json, { error: "sortBy must be one of: createdAt, updatedAt" });
    console.log("✅ Step 07 - Test 6 passed");

    // # 7
    res = await fetch(`${baseUrl}/posts?order=up`);
    json = await res.json();
    assert.equal(res.status, 400);
    assert.deepEqual(json, { error: "order must be asc or desc" });
    console.log("✅ Step 07 - Test 7 passed");

    console.log("\n================ Step 08: Filtering on GET /posts ================");
    // # 1
    res = await fetch(`${baseUrl}/posts?location=GOA`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.meta.total, 4);
    assert.equal(json.meta.totalPages, 1);
    assert.deepEqual(json.data.map(p => getInstaId(p.imageUrl)), ["insta23", "insta16", "insta10", "insta01"]);
    console.log("✅ Step 08 - Test 1 passed (case-insensitive location match)");

    // # 2
    res = await fetch(`${baseUrl}/posts?search=sunset`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.meta.total, 3);
    assert.equal(json.meta.totalPages, 1);
    assert.deepEqual(json.data.map(p => getInstaId(p.imageUrl)), ["insta20", "insta08", "insta01"]);
    console.log("✅ Step 08 - Test 2 passed");

    // # 3
    res = await fetch(`${baseUrl}/posts?from=2026-03-01&to=2026-04-01`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.meta.total, 8);
    assert.equal(json.meta.totalPages, 1);
    assert.equal(json.data.length, 8);
    assert.equal(getInstaId(json.data[0].imageUrl), "insta16");
    assert.equal(getInstaId(json.data[1].imageUrl), "insta15");
    assert.equal(getInstaId(json.data[7].imageUrl), "insta09");
    console.log("✅ Step 08 - Test 3 passed (date range)");

    // # 4
    res = await fetch(`${baseUrl}/posts?from=2026-04-01`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.meta.total, 8);
    assert.equal(json.meta.totalPages, 1);
    assert.equal(json.data.length, 8);
    assert.equal(getInstaId(json.data[0].imageUrl), "insta24");
    assert.equal(getInstaId(json.data[1].imageUrl), "insta23");
    assert.equal(getInstaId(json.data[7].imageUrl), "insta17");
    console.log("✅ Step 08 - Test 4 passed (from date)");

    // # 5
    res = await fetch(`${baseUrl}/posts?location=pune&search=CHAI`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.meta.total, 1);
    assert.equal(json.meta.totalPages, 1);
    assert.deepEqual(json.data.map(p => getInstaId(p.imageUrl)), ["insta15"]);
    console.log("✅ Step 08 - Test 5 passed");

    // # 6
    res = await fetch(`${baseUrl}/posts?location=mumbai&limit=2&page=2`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.meta.total, 4);
    assert.equal(json.meta.totalPages, 2);
    assert.deepEqual(json.data.map(p => getInstaId(p.imageUrl)), ["insta06", "insta02"]);
    console.log("✅ Step 08 - Test 6 passed");

    // # 7
    res = await fetch(`${baseUrl}/posts?from=yesterday`);
    json = await res.json();
    assert.equal(res.status, 400);
    assert.deepEqual(json, { error: "from and to must be valid dates" });
    console.log("✅ Step 08 - Test 7 passed (invalid date)");

    console.log("\n================ Previous Lab CRUD Routes Verification ================");
    // GET /health
    res = await fetch(`${baseUrl}/health`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(json, { status: "OK" });

    // POST /users
    res = await fetch(`${baseUrl}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "test_crud_user",
        email: "test_crud@example.com",
        fullname: "Test User",
      }),
    });
    json = await res.json();
    assert.equal(res.status, 201);
    const newUserId = json.id;

    // GET /users/:id
    res = await fetch(`${baseUrl}/users/${newUserId}`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.username, "test_crud_user");

    // PATCH /users/:id
    res = await fetch(`${baseUrl}/users/${newUserId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio: "Updated Bio" }),
    });
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.bio, "Updated Bio");

    // DELETE /users/:id
    res = await fetch(`${baseUrl}/users/${newUserId}`, {
      method: "DELETE",
    });
    assert.equal(res.status, 204);

    // POST /posts
    res = await fetch(`${baseUrl}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: "https://example.com/test.jpg",
        caption: "Test post",
      }),
    });
    json = await res.json();
    assert.equal(res.status, 201);
    const newPostId = json.id;

    // GET /posts/:id
    res = await fetch(`${baseUrl}/posts/${newPostId}`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.caption, "Test post");

    // PATCH /posts/:id
    res = await fetch(`${baseUrl}/posts/${newPostId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: "Updated caption" }),
    });
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.caption, "Updated caption");

    // DELETE /posts/:id
    res = await fetch(`${baseUrl}/posts/${newPostId}`, {
      method: "DELETE",
    });
    assert.equal(res.status, 204);
    console.log("✅ All previous CRUD routes verified successfully!");

    console.log("\n🎉 ALL TESTS IN LAB PASSED FLAWLESSLY! 🎉\n");
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
