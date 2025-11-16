/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  await knex('time_gradients').del();
  await knex('time_gradients').insert([
    {id: 1, start_time: '00:00', end_time: '06:00', start_rgb: '#8B0000', end_rgb: '#4B0082', is_active: true},
    {id: 2, start_time: '06:00', end_time: '09:00', start_rgb: '#4B0082', end_rgb: '#FF8C00', is_active: true},
    {id: 3, start_time: '09:00', end_time: '12:00', start_rgb: '#FF8C00', end_rgb: '#FFFF00', is_active: true},
    {id: 4, start_time: '12:00', end_time: '16:00', start_rgb: '#FFFF00', end_rgb: '#32CD32', is_active: true},
    {id: 5, start_time: '16:00', end_time: '20:00', start_rgb: '#32CD32', end_rgb: '#00008B', is_active: true},
    {id: 6, start_time: '20:00', end_time: '23:59', start_rgb: '#00008B', end_rgb: '#8B0000', is_active: true}
  ]);
};
