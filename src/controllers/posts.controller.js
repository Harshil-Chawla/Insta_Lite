const {
  createPost,
  listPosts,
  getPostById,
  updatePost,
  deletePost,
} = require("../services/posts.service");
const {
  parsePagination,
  formatPaginatedResponse,
} = require("../utils/pagination");

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
    const pagination = parsePagination(req.query);
    if (pagination.error) {
      return res.status(400).json({ error: pagination.error });
    }
    const { page, limit, skip, take } = pagination;

    const allowedSortBy = ["createdAt", "updatedAt"];
    const sortBy = req.query.sortBy || "createdAt";
    if (!allowedSortBy.includes(sortBy)) {
      return res.status(400).json({
        error: "sortBy must be one of: createdAt, updatedAt",
      });
    }

    const allowedOrder = ["asc", "desc"];
    const order = req.query.order || "desc";
    if (!allowedOrder.includes(order)) {
      return res.status(400).json({ error: "order must be asc or desc" });
    }

    const where = {};

    if (req.query.location) {
      where.location = {
        equals: req.query.location,
        mode: "insensitive",
      };
    }

    if (req.query.search) {
      where.caption = {
        contains: req.query.search,
        mode: "insensitive",
      };
    }

    let fromDate;
    let toDate;

    if (req.query.from !== undefined) {
      fromDate = new Date(req.query.from);
      if (isNaN(fromDate.getTime())) {
        return res
          .status(400)
          .json({ error: "from and to must be valid dates" });
      }
    }

    if (req.query.to !== undefined) {
      toDate = new Date(req.query.to);
      if (isNaN(toDate.getTime())) {
        return res
          .status(400)
          .json({ error: "from and to must be valid dates" });
      }
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lt = toDate;
    }

    const orderBy = { [sortBy]: order };

    const { data, total } = await listPosts({
      skip,
      take,
      orderBy,
      where,
    });

    return res
      .status(200)
      .json(formatPaginatedResponse(data, page, limit, total));
  } catch (error) {
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
