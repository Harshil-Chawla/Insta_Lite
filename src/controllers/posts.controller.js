const {
  createPost,
  listPosts,
  getPostById,
  updatePost,
  deletePost,
} = require("../services/posts.service");

const create = async (req, res) => {
  try {
    const { imageUrl, caption, location } = req.body || {};
    if (!imageUrl) {
      return res.status(400).json({ error: "imageUrl is required" });
    }

    const postData = { imageUrl };
    if (caption !== undefined) postData.caption = caption;
    if (location !== undefined) postData.location = location;

    const result = await createPost(postData);
    return res.status(201).json(result);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

const list = async (req, res) => {
  try {
    const result = await listPosts();
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getOne = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(404).json({ error: "Post not found" });
    }

    const post = await getPostById(id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    return res.status(200).json(post);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

const update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(404).json({ error: "Post not found" });
    }

    const updateData = {};
    if (req.body.caption !== undefined) updateData.caption = req.body.caption;
    if (req.body.location !== undefined) updateData.location = req.body.location;

    const updatedPost = await updatePost(id, updateData);
    return res.status(200).json(updatedPost);
  } catch (err) {
    return res.status(404).json({ error: "Post not found" });
  }
};

const remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(404).json({ error: "Post not found" });
    }

    await deletePost(id);
    return res.status(204).send();
  } catch (err) {
    return res.status(404).json({ error: "Post not found" });
  }
};

module.exports = { create, list, getOne, update, remove };
