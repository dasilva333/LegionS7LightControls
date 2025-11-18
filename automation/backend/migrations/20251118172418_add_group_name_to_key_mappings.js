/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('key_mappings', table => {
    // Adding the column. 
    // We set it to nullable first so existing rows aren't invalid.
    table.string('group_name').nullable(); 
    
    // Optional: If you want to ensure future inserts have a group:
    // table.string('group_name').notNullable().defaultTo('Misc');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('key_mappings', table => {
    table.dropColumn('group_name');
  });
};