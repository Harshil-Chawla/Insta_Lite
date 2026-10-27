const prisma = require("../db");
const likesService = require("../services/likes.service");

async function listLikes(req, res) {
  try {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId)) {
      return res.status(404).json({ error: "Post not found" });
    }

    const users = await likesService.getLikesByPostId(postId);
    if (users === null) {
      return res.status(404).json({ error: "Post not found" });
    }

    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function likePost(req, res) {
  try {
    // 1. Check userId provided
    if (!req.body || req.body.userId === undefined || req.body.userId === null) {
      return res.status(400).json({ error: "userId is required" });
    }

    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId)) {
      return res.status(404).json({ error: "Post not found" });
    }

    // 2. Check post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const userId = parseInt(req.body.userId, 10);
    if (isNaN(userId)) {
      return res.status(404).json({ error: "User not found" });
    }

    // 3. Check user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 4. Create like
    try {
      const like = await likesService.addLike(userId, postId);
      return res.status(201).json(like);
    } catch (err) {
      if (err.code === "P2002") {
        return res.status(409).json({ error: "Already liked" });
      }
      throw err;
    }
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function unlikePost(req, res) {
  try {
    const postId = parseInt(req.params.id, 10);
    const userId = parseInt(req.params.userId, 10);

    if (isNaN(postId) || isNaN(userId)) {
      return res.status(404).json({ error: "Like not found" });
    }

    await likesService.removeLike(userId, postId);
    return res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Like not found" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  listLikes,
  likePost,
  unlikePost,
};
