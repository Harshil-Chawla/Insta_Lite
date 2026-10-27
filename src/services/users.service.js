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

module.exports = {
  createUser,
  listUsers,
  listUser: listUsers,
  getUserById,
  updateUser,
  deleteUser,
};
