const prisma = require("../src/db");
const { users, posts, likes } = require("./seed-data");

function getInstaKey(imageUrl) {
  const match = imageUrl.match(/insta\d+/);
  return match ? match[0] : imageUrl.split("/")[4];
}

async function main() {
  // 1. Delete all rows from all three tables. Children first: likes, then posts, then users
  await prisma.like.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create all users in one query and get created rows back
  const createdUsers = await prisma.user.createManyAndReturn({
    data: users,
  });

  // 3. Build a lookup: username -> id
  const userLookup = new Map();
  for (const user of createdUsers) {
    userLookup.set(user.username, user.id);
  }

  // 4. Create all posts in one query, replacing author with real authorId, and get created rows back
  const postsWithAuthorId = posts.map((post) => {
    const { author, ...rest } = post;
    const authorId = userLookup.get(author);
    return {
      ...rest,
      authorId,
    };
  });

  const createdPosts = await prisma.post.createManyAndReturn({
    data: postsWithAuthorId,
  });

  // 5. Build a lookup: insta## -> post id
  const postLookup = new Map();
  for (const post of createdPosts) {
    const key = getInstaKey(post.imageUrl);
    postLookup.set(key, post.id);
  }

  // 6. Create all likes in one query (real userId and postId)
  const mappedLikes = likes.map((like) => ({
    userId: userLookup.get(like.user),
    postId: postLookup.get(like.post),
  }));

  const createdLikes = await prisma.like.createManyAndReturn({
    data: mappedLikes,
  });

  // 7. Print seeded counts from what the queries returned
  console.log(
    `🌱 Seeded ${createdUsers.length} users, ${createdPosts.length} posts and ${createdLikes.length} likes`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
