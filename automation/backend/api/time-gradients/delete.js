const { buildCrudHandlers } = require("../helpers/crud");

const handlers = buildCrudHandlers("time_gradients", []);

module.exports = {
  method: "delete",
  route: "/time-gradients/:id",
  handler: handlers.remove
};
