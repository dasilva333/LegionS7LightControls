/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  await knex('animation_definitions').del();
  await knex('animation_definitions').insert([
    {animation_id: 1, name: 'Screw Rainbow', description: 'All keys cycle rainbow together.', has_color_list: true},
    {animation_id: 2, name: 'Rainbow Wave', description: 'Rainbow gradient scrolls across keys.', has_color_list: true},
    {animation_id: 3, name: 'Color Change', description: 'Keys fade to random colors without blackouts.', has_color_list: true},
    {animation_id: 4, name: 'Color Pulse', description: 'Keys fade to black then back to color.', has_color_list: true},
    {animation_id: 5, name: 'Color Wave', description: 'Random color wave sweeps the board.', has_color_list: true},
    {animation_id: 6, name: 'Smooth', description: 'Slow rainbow transition.', has_color_list: true},
    {animation_id: 7, name: 'Rain', description: 'Random rain drops fall vertically.', has_color_list: true},
    {animation_id: 8, name: 'Ripple', description: 'Ripples emanate from each keypress.', has_color_list: true},
    {animation_id: 9, name: 'Audio Bounce lighting', description: 'Audio-reactive bounce (VU-style).', has_color_list: false},
    {animation_id: 10, name: 'Audio Ripple lighting', description: 'Audio-reactive ripples from a center point.', has_color_list: false},
    {animation_id: 11, name: 'Always', description: 'Static solid color layer.', has_color_list: true},
    {animation_id: 12, name: 'Type lighting', description: 'Key lights on press.', has_color_list: true},
    {animation_id: 1005, name: 'Aurora Sync', description: 'Mirrors screen colors.', has_color_list: false}
  ]);
};
