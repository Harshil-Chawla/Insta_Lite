const {
  createUser,
  listUsers,
  getUserById,
  updateUser,
  deleteUser,
  listPostsByUserId,
  listLikedPostsByUserId,
} = require("../services/users.service");
const {
  parsePagination,
  formatPaginatedResponse,
} = require("../utils/pagination");

const create = async (req, res) => {
  try {
    const { username, email, fullname, bio } = req.body || {};
    if (!username || !email || !fullname) {
      return res
        .status(400)
        .json({ error: "username, email and fullname are required" });
    }

    const userData = { username, email, fullname };
    if (bio !== undefined) {
      userData.bio = bio;
    }

    const result = await createUser(userData);
    return res.status(201).json(result);
  } catch (err) {
    return res.status(409).json({ error: "username or email already taken" });
  }
};

const list = async (req, res) => {
  try {
    const pagination = parsePagination(req.query);
    if (pagination.error) {
      return res.status(400).json({ error: pagination.error });
    }
    const { page, limit, skip, take } = pagination;

    const allowedSortBy = ["createdAt", "username", "fullname"];
    const sortBy = req.query.sortBy || "createdAt";
    if (!allowedSortBy.includes(sortBy)) {
      return res
        .status(400)
        .json({ error: "sortBy must be one of: createdAt, username, fullname" });
    }

    const allowedOrder = ["asc", "desc"];
    const order = req.query.order || "desc";
    if (!allowedOrder.includes(order)) {
      return res.status(400).json({ error: "order must be asc or desc" });
    }

    const where = {};

    if (req.query.isPrivate !== undefined) {
      if (req.query.isPrivate === "true") {
        where.isPrivate = true;
      } else if (req.query.isPrivate === "false") {
        where.isPrivate = false;
      } else {
        return res
          .status(400)
          .json({ error: "isPrivate must be true or false" });
      }
    }

    if (req.query.hasPosts !== undefined) {
      if (req.query.hasPosts === "true") {
        where.posts = { some: {} };
      } else if (req.query.hasPosts === "false") {
        where.posts = { none: {} };
      } else {
        return res
          .status(400)
          .json({ error: "hasPosts must be true or false" });
      }
    }

    if (req.query.search) {
      where.OR = [
        { username: { contains: req.query.search, mode: "insensitive" } },
        { fullname: { contains: req.query.search, mode: "insensitive" } },
      ];
    }

    const orderBy = { [sortBy]: order };

    const { data, total } = await listUsers({
      skip,
      take,
      orderBy,
      where,
    });

    return res
      .status(200)
      .json(formatPaginatedResponse(data, page, limit, total));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getOne = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = await getUserById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(user);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

const update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(404).json({ error: "User not found" });
    }

    const updateData = {};
    if (req.body.fullname !== undefined) updateData.fullname = req.body.fullname;
    if (req.body.bio !== undefined) updateData.bio = req.body.bio;
    if (req.body.isPrivate !== undefined) updateData.isPrivate = req.body.isPrivate;

    const updatedUser = await updateUser(id, updateData);
    return res.status(200).json(updatedUser);
  } catch (err) {
    return res.status(404).json({ error: "User not found" });
  }
};

const remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(404).json({ error: "User not found" });
    }

    await deleteUser(id);
    return res.status(204).send();
  } catch (err) {
    return res.status(404).json({ error: "User not found" });
  }
};

const getUserPosts = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(404).json({ error: "User not found" });
    }

    const pagination = parsePagination(req.query);
    if (pagination.error) {
      return res.status(400).json({ error: pagination.error });
    }

    const result = await listPostsByUserId(id, {
      skip: pagination.skip,
      take: pagination.take,
    });

    if (result === null) {
      return res.status(404).json({ error: "User not found" });
    }

    return res
      .status(200)
      .json(
        formatPaginatedResponse(
          result.data,
          pagination.page,
          pagination.limit,
          result.total
        )
      );
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getLikedPosts = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(404).json({ error: "User not found" });
    }

    const pagination = parsePagination(req.query);
    if (pagination.error) {
      return res.status(400).json({ error: pagination.error });
    }

    const result = await listLikedPostsByUserId(id, {
      skip: pagination.skip,
      take: pagination.take,
    });

    if (result === null) {
      return res.status(404).json({ error: "User not found" });
    }

    return res
      .status(200)
      .json(
        formatPaginatedResponse(
          result.data,
          pagination.page,
          pagination.limit,
          result.total
        )
      );
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  create,
  list,
  getOne,
  update,
  remove,
  getUserPosts,
  getLikedPosts,
};
