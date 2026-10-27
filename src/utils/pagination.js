function parsePagination(query) {
  const isPositiveInteger = (val) => /^[1-9]\d*$/.test(val);

  if (query.page !== undefined && !isPositiveInteger(query.page)) {
    return { error: "page and limit must be positive integers" };
  }

  if (query.limit !== undefined && !isPositiveInteger(query.limit)) {
    return { error: "page and limit must be positive integers" };
  }

  const page = query.page ? parseInt(query.page, 10) : 1;
  let limit = query.limit ? parseInt(query.limit, 10) : 10;
  if (limit > 50) limit = 50;

  const skip = (page - 1) * limit;
  const take = limit;

  return { page, limit, skip, take };
}

function formatPaginatedResponse(data, page, limit, total) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

module.exports = { parsePagination, formatPaginatedResponse };
