/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // 1. Clean the table so we don't get unique constraint errors
  await knex('processes').del();

  // 2. Insert the process
  await knex('processes').insert([
    {
      process_name: 'Destiny2.exe',   // The exact executable name in Task Manager
      profile_filename: 'aurora_sync', // The file inside json_effects/ (without .json is fine if logic handles it, but usually good to match your logic)
      is_active: true,
      priority: 50                     // Higher number = higher priority if we add sorting later
    }
  ]);
};