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

  const server = app.listen(3003);
  const baseUrl = "http://localhost:3003";

  try {
    console.log("\n================ Step 04: POST /posts and PATCH /posts/:id with authorId ================");
    let riyaRes = await fetch(`${baseUrl}/users?search=riya`);
    let riyaData = await riyaRes.json();
    const riyaId = riyaData.data[0].id;

    let arjunRes = await fetch(`${baseUrl}/users?search=arjun`);
    let arjunData = await arjunRes.json();
    const arjunId = arjunData.data[0].id;

    let bagaRes = await fetch(`${baseUrl}/posts?search=baga`);
    let bagaData = await bagaRes.json();
    const insta01Id = bagaData.data[0].id;

    // 1. POST /posts success
    let res = await fetch(`${baseUrl}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: "https://picsum.photos/seed/new01/600/600",
        caption: "First post!",
        authorId: riyaId,
      }),
    });
    let json = await res.json();
    assert.equal(res.status, 201);
    assert.equal(json.authorId, riyaId);
    await prisma.post.delete({ where: { id: json.id } });
    console.log("✅ Step 04 - Test 1 passed: Created post with authorId");

    // 2. Missing authorId
    res = await fetch(`${baseUrl}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: "https://picsum.photos/seed/new02/600/600",
      }),
    });
    json = await res.json();
    assert.equal(res.status, 400);
    assert.deepEqual(json, { error: "imageUrl and authorId are required" });
    console.log("✅ Step 04 - Test 2 passed: Missing authorId returns 400");

    // 3. Non-existent authorId
    res = await fetch(`${baseUrl}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: "https://picsum.photos/seed/new03/600/600",
        authorId: 999999,
      }),
    });
    json = await res.json();
    assert.equal(res.status, 404);
    assert.deepEqual(json, { error: "User not found" });
    console.log("✅ Step 04 - Test 3 passed: Non-existent authorId returns 404");

    // 4. PATCH authorId ignored
    res = await fetch(`${baseUrl}/posts/${insta01Id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caption: "Baga, again 🌅",
        authorId: arjunId,
      }),
    });
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.caption, "Baga, again 🌅");
    assert.equal(json.authorId, riyaId);
    console.log("✅ Step 04 - Test 4 passed: authorId is uneditable");

    console.log("\n================ Step 05: GET /posts/:id with author and like count ================");
    res = await fetch(`${baseUrl}/posts/${insta01Id}`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.author.username, "riya_travels");
    assert.equal(json.author.email, undefined);
    assert.deepEqual(json._count, { likes: 5 });
    console.log("✅ Step 05 - Test 1 passed (insta01 author and likes: 5)");

    let tigerRes = await fetch(`${baseUrl}/posts?search=tiger`);
    let tigerData = await tigerRes.json();
    const insta24Id = tigerData.data[0].id;
    res = await fetch(`${baseUrl}/posts/${insta24Id}`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.author.username, "dev_shoots");
    assert.deepEqual(json._count, { likes: 6 });
    console.log("✅ Step 05 - Test 2 passed (insta24 author and likes: 6)");

    let puneRes = await fetch(`${baseUrl}/posts?location=pune&order=asc&limit=1`);
    let puneData = await puneRes.json();
    const insta05Id = puneData.data[0].id;
    res = await fetch(`${baseUrl}/posts/${insta05Id}`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.author.username, "arjun_clicks");
    assert.deepEqual(json._count, { likes: 0 });
    console.log("✅ Step 05 - Test 3 passed (insta05 author and likes: 0)");

    res = await fetch(`${baseUrl}/posts/999999`);
    json = await res.json();
    assert.equal(res.status, 404);
    assert.deepEqual(json, { error: "Post not found" });
    console.log("✅ Step 05 - Test 4 passed: 404 for non-existent post");

    console.log("\n================ Step 06: GET /posts with authors, like counts and sortBy=likes ================");
    res = await fetch(`${baseUrl}/posts?limit=2`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(getInstaId(json.data[0].imageUrl), "insta24");
    assert.equal(json.data[0].author.username, "dev_shoots");
    assert.deepEqual(json.data[0]._count, { likes: 6 });
    assert.equal(getInstaId(json.data[1].imageUrl), "insta23");
    assert.equal(json.data[1].author.username, "riya_travels");
    assert.deepEqual(json.data[1]._count, { likes: 0 });
    console.log("✅ Step 06 - Test 1 passed");

    res = await fetch(`${baseUrl}/posts?sortBy=likes&limit=5`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(
      json.data.map(p => getInstaId(p.imageUrl)),
      ["insta24", "insta01", "insta15", "insta10", "insta08"]
    );
    console.log("✅ Step 06 - Test 2 passed: sortBy=likes desc tie-breaker newest first");

    res = await fetch(`${baseUrl}/posts?sortBy=likes&order=asc&limit=3`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(
      json.data.map(p => getInstaId(p.imageUrl)),
      ["insta23", "insta21", "insta19"]
    );
    console.log("✅ Step 06 - Test 3 passed: sortBy=likes asc tie-breaker newest first");

    res = await fetch(`${baseUrl}/posts?location=goa&sortBy=likes`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.meta.total, 4);
    assert.deepEqual(
      json.data.map(p => getInstaId(p.imageUrl)),
      ["insta01", "insta10", "insta23", "insta16"]
    );
    console.log("✅ Step 06 - Test 4 passed: location=goa & sortBy=likes");

    res = await fetch(`${baseUrl}/posts?sortBy=comments`);
    json = await res.json();
    assert.equal(res.status, 400);
    assert.deepEqual(json, { error: "sortBy must be one of: createdAt, updatedAt, likes" });
    console.log("✅ Step 06 - Test 5 passed: invalid sortBy returns 400");

    console.log("\n================ Step 07: GET /users/:id with counts, and hasPosts filter ================");
    res = await fetch(`${baseUrl}/users/${riyaId}`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.username, "riya_travels");
    assert.deepEqual(json._count, { posts: 7, likes: 4 });
    console.log("✅ Step 07 - Test 1 passed (riya posts: 7, likes: 4)");

    let devRes = await fetch(`${baseUrl}/users?search=dev`);
    let devData = await devRes.json();
    const devId = devData.data[0].id;
    res = await fetch(`${baseUrl}/users/${devId}`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.username, "dev_shoots");
    assert.deepEqual(json._count, { posts: 2, likes: 1 });
    console.log("✅ Step 07 - Test 2 passed (dev posts: 2, likes: 1)");

    let adityaRes = await fetch(`${baseUrl}/users?search=aditya`);
    let adityaData = await adityaRes.json();
    const adityaId = adityaData.data[0].id;
    res = await fetch(`${baseUrl}/users/${adityaId}`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.username, "aditya_codes");
    assert.deepEqual(json._count, { posts: 0, likes: 2 });
    console.log("✅ Step 07 - Test 3 passed (aditya posts: 0, likes: 2)");

    res = await fetch(`${baseUrl}/users?hasPosts=false`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.meta.total, 2);
    assert.deepEqual(json.data.map(u => u.username), ["aditya_codes", "neha_designs"]);
    console.log("✅ Step 07 - Test 4 passed: hasPosts=false");

    res = await fetch(`${baseUrl}/users?hasPosts=true`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.meta.total, 10);
    console.log("✅ Step 07 - Test 5 passed: hasPosts=true");

    res = await fetch(`${baseUrl}/users?hasPosts=true&isPrivate=true`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.meta.total, 3);
    assert.deepEqual(json.data.map(u => u.username), ["dev_shoots", "ananya_reads", "meera.eats"]);
    console.log("✅ Step 07 - Test 6 passed: hasPosts=true & isPrivate=true");

    res = await fetch(`${baseUrl}/users?hasPosts=yes`);
    json = await res.json();
    assert.equal(res.status, 400);
    assert.deepEqual(json, { error: "hasPosts must be true or false" });
    console.log("✅ Step 07 - Test 7 passed: invalid hasPosts returns 400");

    console.log("\n================ Step 08: GET /users/:id/posts ================");
    res = await fetch(`${baseUrl}/users/${riyaId}/posts?limit=3`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(json.meta, { page: 1, limit: 3, total: 7, totalPages: 3 });
    assert.deepEqual(json.data.map(p => getInstaId(p.imageUrl)), ["insta23", "insta19", "insta16"]);
    console.log("✅ Step 08 - Test 1 passed: page 1 of riya posts");

    res = await fetch(`${baseUrl}/users/${riyaId}/posts?limit=3&page=3`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(json.meta, { page: 3, limit: 3, total: 7, totalPages: 3 });
    assert.deepEqual(json.data.map(p => getInstaId(p.imageUrl)), ["insta01"]);
    console.log("✅ Step 08 - Test 2 passed: page 3 of riya posts");

    res = await fetch(`${baseUrl}/users/${adityaId}/posts`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(json.meta, { page: 1, limit: 10, total: 0, totalPages: 0 });
    assert.deepEqual(json.data, []);
    console.log("✅ Step 08 - Test 3 passed: aditya has no posts");

    res = await fetch(`${baseUrl}/users/999999/posts`);
    json = await res.json();
    assert.equal(res.status, 404);
    assert.deepEqual(json, { error: "User not found" });
    console.log("✅ Step 08 - Test 4 passed: user not found 404");

    res = await fetch(`${baseUrl}/users/${riyaId}/posts?page=0`);
    json = await res.json();
    assert.equal(res.status, 400);
    assert.deepEqual(json, { error: "page and limit must be positive integers" });
    console.log("✅ Step 08 - Test 5 passed: invalid page returns 400");

    console.log("\n================ Step 09: GET /posts/:id/likes ================");
    res = await fetch(`${baseUrl}/posts/${insta01Id}/likes`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(
      json.map(u => u.username),
      ["arjun_clicks", "isha_dances", "meera.eats", "neha_designs", "vikram.trek"]
    );
    console.log("✅ Step 09 - Test 1 passed: insta01 likes");

    res = await fetch(`${baseUrl}/posts/${insta24Id}/likes`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(
      json.map(u => u.username),
      ["aditya_codes", "arjun_clicks", "riya_travels", "rohan_runs", "sara_sketches", "vikram.trek"]
    );
    console.log("✅ Step 09 - Test 2 passed: insta24 likes");

    res = await fetch(`${baseUrl}/posts/${insta05Id}/likes`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(json, []);
    console.log("✅ Step 09 - Test 3 passed: insta05 no likes returns []");

    res = await fetch(`${baseUrl}/posts/999999/likes`);
    json = await res.json();
    assert.equal(res.status, 404);
    assert.deepEqual(json, { error: "Post not found" });
    console.log("✅ Step 09 - Test 4 passed: non-existent post 404");

    console.log("\n================ Step 10: Like and unlike ================");
    // 1. Like post
    res = await fetch(`${baseUrl}/posts/${insta05Id}/likes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: riyaId }),
    });
    json = await res.json();
    assert.equal(res.status, 201);
    assert.equal(json.userId, riyaId);
    assert.equal(json.postId, insta05Id);
    console.log("✅ Step 10 - Test 1 passed: Like created 201");

    // 2. Duplicate like
    res = await fetch(`${baseUrl}/posts/${insta05Id}/likes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: riyaId }),
    });
    json = await res.json();
    assert.equal(res.status, 409);
    assert.deepEqual(json, { error: "Already liked" });
    console.log("✅ Step 10 - Test 2 passed: Duplicate like returns 409");

    // 3. Missing userId
    res = await fetch(`${baseUrl}/posts/${insta05Id}/likes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    json = await res.json();
    assert.equal(res.status, 400);
    assert.deepEqual(json, { error: "userId is required" });
    console.log("✅ Step 10 - Test 3 passed: Missing userId returns 400");

    // 4. Post not found
    res = await fetch(`${baseUrl}/posts/999999/likes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: riyaId }),
    });
    json = await res.json();
    assert.equal(res.status, 404);
    assert.deepEqual(json, { error: "Post not found" });
    console.log("✅ Step 10 - Test 4 passed: Post not found 404");

    // 5. User not found
    res = await fetch(`${baseUrl}/posts/${insta05Id}/likes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: 999999 }),
    });
    json = await res.json();
    assert.equal(res.status, 404);
    assert.deepEqual(json, { error: "User not found" });
    console.log("✅ Step 10 - Test 5 passed: User not found 404");

    // 6. Check post count
    res = await fetch(`${baseUrl}/posts/${insta05Id}`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json._count.likes, 1);
    console.log("✅ Step 10 - Test 6 passed: Post likes count is 1");

    // 7. Check likes list
    res = await fetch(`${baseUrl}/posts/${insta05Id}/likes`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(json.map(u => u.username), ["riya_travels"]);
    console.log("✅ Step 10 - Test 7 passed: Likes list contains riya");

    // 8. Delete like
    res = await fetch(`${baseUrl}/posts/${insta05Id}/likes/${riyaId}`, {
      method: "DELETE",
    });
    assert.equal(res.status, 204);
    console.log("✅ Step 10 - Test 8 passed: Delete like returns 204");

    // 9. Delete like again
    res = await fetch(`${baseUrl}/posts/${insta05Id}/likes/${riyaId}`, {
      method: "DELETE",
    });
    json = await res.json();
    assert.equal(res.status, 404);
    assert.deepEqual(json, { error: "Like not found" });
    console.log("✅ Step 10 - Test 9 passed: Like not found returns 404");

    console.log("\n================ Step 11: Cascading Deletes ================");
    console.log("Re-seeding database before Step 11...");
    execSync("npm run seed", { stdio: "inherit" });

    // Re-fetch IDs after seed
    riyaRes = await fetch(`${baseUrl}/users?search=riya`);
    const freshRiyaId = (await riyaRes.json()).data[0].id;

    arjunRes = await fetch(`${baseUrl}/users?search=arjun`);
    const freshArjunId = (await arjunRes.json()).data[0].id;

    let thaliRes = await fetch(`${baseUrl}/posts?search=thali`);
    const freshInsta10Id = (await thaliRes.json()).data[0].id;

    tigerRes = await fetch(`${baseUrl}/posts?search=tiger`);
    const freshInsta24Id = (await tigerRes.json()).data[0].id;

    // Delete riya
    res = await fetch(`${baseUrl}/users/${freshRiyaId}`, {
      method: "DELETE",
    });
    assert.equal(res.status, 204);
    console.log("Riya deleted!");

    // 1. Users total = 11
    res = await fetch(`${baseUrl}/users?limit=1`);
    json = await res.json();
    assert.equal(json.meta.total, 11);
    console.log("✅ Step 11 - Test 1 passed: Users count is 11");

    // 2. Posts total = 17
    res = await fetch(`${baseUrl}/posts?limit=1`);
    json = await res.json();
    assert.equal(json.meta.total, 17);
    console.log("✅ Step 11 - Test 2 passed: Posts count is 17");

    // 3. Goa posts: only insta10
    res = await fetch(`${baseUrl}/posts?location=goa`);
    json = await res.json();
    assert.deepEqual(json.data.map(p => getInstaId(p.imageUrl)), ["insta10"]);
    console.log("✅ Step 11 - Test 3 passed: Only insta10 in Goa");

    // 4. sortBy=likes: insta24 (5), insta15 (3), insta17 (2)
    res = await fetch(`${baseUrl}/posts?sortBy=likes&limit=3`);
    json = await res.json();
    assert.deepEqual(json.data.map(p => getInstaId(p.imageUrl)), ["insta24", "insta15", "insta17"]);
    assert.equal(json.data[0]._count.likes, 5);
    assert.equal(json.data[1]._count.likes, 3);
    assert.equal(json.data[2]._count.likes, 2);
    console.log("✅ Step 11 - Test 4 passed: Top liked posts updated");

    // 5. insta10 likes: ananya_reads, kabir_sings
    res = await fetch(`${baseUrl}/posts/${freshInsta10Id}/likes`);
    json = await res.json();
    assert.deepEqual(json.map(u => u.username), ["ananya_reads", "kabir_sings"]);
    console.log("✅ Step 11 - Test 5 passed: insta10 likes updated");

    // 6. insta24 likes: riya is gone
    res = await fetch(`${baseUrl}/posts/${freshInsta24Id}/likes`);
    json = await res.json();
    assert.deepEqual(
      json.map(u => u.username),
      ["aditya_codes", "arjun_clicks", "rohan_runs", "sara_sketches", "vikram.trek"]
    );
    console.log("✅ Step 11 - Test 6 passed: insta24 likes updated");

    // 7. arjun count: posts: 4, likes: 2
    res = await fetch(`${baseUrl}/users/${freshArjunId}`);
    json = await res.json();
    assert.deepEqual(json._count, { posts: 4, likes: 2 });
    console.log("✅ Step 11 - Test 7 passed: arjun _count is posts: 4, likes: 2");

    // 8. riya posts: 404
    res = await fetch(`${baseUrl}/users/${freshRiyaId}/posts`);
    json = await res.json();
    assert.equal(res.status, 404);
    assert.deepEqual(json, { error: "User not found" });
    console.log("✅ Step 11 - Test 8 passed: riya posts returns 404");

    console.log("\n================ Step 12: GET /users/:id/liked-posts (Bonus) ================");
    console.log("Re-seeding database before Step 12...");
    execSync("npm run seed", { stdio: "inherit" });

    riyaRes = await fetch(`${baseUrl}/users?search=riya`);
    const riyaIdFinal = (await riyaRes.json()).data[0].id;

    arjunRes = await fetch(`${baseUrl}/users?search=arjun`);
    const arjunIdFinal = (await arjunRes.json()).data[0].id;

    let nehaRes = await fetch(`${baseUrl}/users?search=neha`);
    const nehaIdFinal = (await nehaRes.json()).data[0].id;

    // 1. riya liked posts
    res = await fetch(`${baseUrl}/users/${riyaIdFinal}/liked-posts`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(json.meta, { page: 1, limit: 10, total: 4, totalPages: 1 });
    assert.deepEqual(
      json.data.map(p => getInstaId(p.imageUrl)),
      ["insta24", "insta20", "insta10", "insta03"]
    );
    console.log("✅ Step 12 - Test 1 passed: Riya liked-posts");

    // 2. arjun liked posts limit=2
    res = await fetch(`${baseUrl}/users/${arjunIdFinal}/liked-posts?limit=2`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(json.meta, { page: 1, limit: 2, total: 4, totalPages: 2 });
    assert.deepEqual(
      json.data.map(p => getInstaId(p.imageUrl)),
      ["insta24", "insta14"]
    );
    console.log("✅ Step 12 - Test 2 passed: Arjun liked-posts limit=2");

    // 3. neha liked posts
    res = await fetch(`${baseUrl}/users/${nehaIdFinal}/liked-posts`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(json.meta, { page: 1, limit: 10, total: 3, totalPages: 1 });
    assert.deepEqual(
      json.data.map(p => getInstaId(p.imageUrl)),
      ["insta22", "insta15", "insta01"]
    );
    console.log("✅ Step 12 - Test 3 passed: Neha liked-posts");

    // 4. new user liked posts
    const newUserRes = await fetch(`${baseUrl}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "brand_new_user",
        email: "brandnew@example.com",
        fullname: "Brand New",
      }),
    });
    const newUserId = (await newUserRes.json()).id;

    res = await fetch(`${baseUrl}/users/${newUserId}/liked-posts`);
    json = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(json.meta, { page: 1, limit: 10, total: 0, totalPages: 0 });
    assert.deepEqual(json.data, []);
    console.log("✅ Step 12 - Test 4 passed: Brand new user has 0 liked posts");

    // 5. non-existent user
    res = await fetch(`${baseUrl}/users/999999/liked-posts`);
    json = await res.json();
    assert.equal(res.status, 404);
    assert.deepEqual(json, { error: "User not found" });
    console.log("✅ Step 12 - Test 5 passed: User not found 404");

    console.log("\n🎉 ALL TESTS IN RELATIONS LAB PASSED FLAWLESSLY! 🎉\n");
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
