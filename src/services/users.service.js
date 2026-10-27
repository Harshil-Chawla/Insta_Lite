const prisma = require("../db");

const createUser = async (data) => {
  return await prisma.user.create({
    data,
  });
};

const listUsers = async ({ skip, take, orderBy, where } = {}) => {
  const [data, total] = await prisma.$transaction([
    prisma.user.findMany({
      skip,
      take,
      orderBy,
      where,
    }),
    prisma.user.count({
      where,
    }),
  ]);
  return { data, total };
};

const getUserById = async (id) => {
  return await prisma.user.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          posts: true,
          likes: true,
        },
      },
    },
  });
};

const updateUser = async (id, data) => {
  return await prisma.user.update({
    where: { id },
    data,
  });
};

const deleteUser = async (id) => {
  return await prisma.user.delete({
    where: { id },
  });
};

const listPostsByUserId = async (authorId, { skip, take } = {}) => {
  const user = await prisma.user.findUnique({
    where: { id: authorId },
  });
  if (!user) return null;

  const [data, total] = await prisma.$transaction([
    prisma.post.findMany({
      where: { authorId },
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            likes: true,
          },
        },
      },
    }),
    prisma.post.count({
      where: { authorId },
    }),
  ]);

  return { data, total };
};

const listLikedPostsByUserId = async (userId, { skip, take } = {}) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) return null;

  const [data, total] = await prisma.$transaction([
    prisma.post.findMany({
      where: {
        likes: {
          some: {
            userId,
          },
        },
      },
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            fullname: true,
          },
        },
        _count: {
          select: {
            likes: true,
          },
        },
      },
    }),
    prisma.post.count({
      where: {
        likes: {
          some: {
            userId,
          },
        },
      },
    }),
  ]);

  return { data, total };
};

module.exports = {
  createUser,
  listUsers,
  listUser: listUsers,
  getUserById,
  updateUser,
  deleteUser,
  listPostsByUserId,
  listLikedPostsByUserId,
};
