/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const groups = require('./key_groups.json');

exports.seed = async function(knex) {
  // 1. Deletes ALL existing entries to reset state
  await knex('key_mappings').del();

  // 2. Flatten the nested JSON structure into an array of rows
  const rowsToInsert = [];

  for (const group of groups) {
    for (const key of group.keys) {
      rowsToInsert.push({
        hardware_index: key.id,
        key_name: key.key_name,
        group_name: group.group_name,
        grid_row: key.row,
        grid_column: key.col
      });
    }
  }

  // 3. Insert all rows
  await knex('key_mappings').insert(rowsToInsert);
};