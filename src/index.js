const app = require("./app");
const prisma = require("./db");

const PORT = process.env.PORT || 3000;

let server;
if (process.env.NODE_ENV !== "test") {
  server = app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });
}

module.exports = { app, prisma, server };
