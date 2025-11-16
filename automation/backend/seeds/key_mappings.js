/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  await knex('key_mappings').del();
  await knex('key_mappings').insert([
    {hardware_index: 1, key_name: 'ESC'},
    {hardware_index: 2, key_name: 'F1'},
    {hardware_index: 3, key_name: 'F2'},
    {hardware_index: 4, key_name: 'F3'},
    {hardware_index: 5, key_name: 'F4'},
    {hardware_index: 6, key_name: 'F5'},
    {hardware_index: 7, key_name: 'F6'},
    {hardware_index: 8, key_name: 'F7'},
    {hardware_index: 9, key_name: 'F8'},
    {hardware_index: 10, key_name: 'F9'},
    {hardware_index: 11, key_name: 'F10'},
    {hardware_index: 12, key_name: 'F11'},
    {hardware_index: 13, key_name: 'F12'}
  ]);
};
