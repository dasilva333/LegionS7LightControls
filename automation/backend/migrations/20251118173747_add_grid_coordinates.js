/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('key_mappings', table => {
    table.integer('grid_row').nullable();
    table.integer('grid_column').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('key_mappings', table => {
    table.dropColumn('grid_row');
    table.dropColumn('grid_column');
  });
};