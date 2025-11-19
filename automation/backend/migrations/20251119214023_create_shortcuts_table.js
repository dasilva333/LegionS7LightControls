/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('shortcuts', (table) => {
      table.increments('id').primary();
      table.string('process_name').notNullable().unique();
      table.text('keys_json').notNullable().defaultTo('[]');
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .alterTable('processes', (table) => {
      table.json('settings_json').defaultTo('{}');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .alterTable('processes', (table) => {
      table.dropColumn('settings_json');
    })
    .dropTableIfExists('shortcuts');
};
