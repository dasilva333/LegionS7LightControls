const knex = require('../../db/knex');

module.exports = {
  method: 'get',
  route: '/static-data',
  handler: async (req, res) => {
    try {
      const [animations, key_map] = await Promise.all([
        knex('animation_definitions').select('animation_id', 'name', 'description', 'has_color_list'),
        knex('key_mappings').select('hardware_index', 'key_name')
      ]);
      res.json({ animations, key_map });
    } catch (err) {
      console.error('GET /static-data failed', err);
      res.status(500).json({ error: 'failed to load static data' });
    }
  }
};
