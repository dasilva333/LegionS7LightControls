const { buildCrudHandlers } = require("../helpers/crud");

const handlers = buildCrudHandlers("time_gradients", [
  { name: "start_time", required: true },
  { name: "end_time", required: true },
  { name: "start_rgb", default: "#000000" },
  { name: "end_rgb", default: "#FFFFFF" },
  { name: "is_active", type: "boolean", default: true }
]);

module.exports = {
  method: "post",
  route: "/time-gradients",
  handler: handlers.create
};
