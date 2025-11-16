/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('global_settings', table => {
      table.string('key').primary();
      table.text('value').notNullable();
    })
    .createTable('processes', table => {
      table.increments('id').primary();
      table.string('process_name').notNullable().unique();
      table.string('profile_filename').notNullable();
      table.boolean('is_active').notNullable().defaultTo(true);
      table.integer('priority').notNullable().defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('notifications', table => {
      table.increments('id').primary();
      table.string('notification_type').notNullable().unique();
      table.string('profile_filename').notNullable();
      table.integer('duration_ms').notNullable().defaultTo(5000);
      table.integer('priority').notNullable().defaultTo(50);
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('time_gradients', table => {
      table.increments('id').primary();
      table.string('start_time', 5).notNullable();
      table.string('end_time', 5).notNullable();
      table.string('start_rgb', 7).notNullable();
      table.string('end_rgb', 7).notNullable();
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('animation_definitions', table => {
      table.increments('id').primary();
      table.integer('animation_id').notNullable().unique();
      table.string('name').notNullable();
      table.text('description');
      table.boolean('has_color_list').notNullable().defaultTo(false);
    })
    .createTable('key_mappings', table => {
      table.increments('id').primary();
      table.integer('hardware_index').notNullable().unique();
      table.string('key_name').notNullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('key_mappings')
    .dropTableIfExists('animation_definitions')
    .dropTableIfExists('time_gradients')
    .dropTableIfExists('notifications')
    .dropTableIfExists('processes')
    .dropTableIfExists('global_settings');
};
