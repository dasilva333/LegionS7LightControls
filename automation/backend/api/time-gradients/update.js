const { buildCrudHandlers } = require("../helpers/crud");

const handlers = buildCrudHandlers("time_gradients", [
  { name: "start_time" },
  { name: "end_time" },
  { name: "start_rgb" },
  { name: "end_rgb" },
  { name: "is_active", type: "boolean" }
]);

module.exports = {
  method: "put",
  route: "/time-gradients/:id",
  handler: handlers.update
};
