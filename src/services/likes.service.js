const prisma = require("../db");

async function addLike(userId, postId) {
  return await prisma.like.create({
    data: {
      userId,
      postId,
    },
  });
}

async function removeLike(userId, postId) {
  return await prisma.like.delete({
    where: {
      userId_postId: {
        userId,
        postId,
      },
    },
  });
}

async function getLikesByPostId(postId) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
  });
  if (!post) return null;

  const likes = await prisma.like.findMany({
    where: { postId },
    orderBy: {
      user: {
        username: "asc",
      },
    },
    select: {
      user: {
        select: {
          id: true,
          username: true,
          fullname: true,
        },
      },
    },
  });

  return likes.map((l) => l.user);
}

module.exports = {
  addLike,
  removeLike,
  getLikesByPostId,
};
