function buildKeyMaps(keyGroups) {
  const KEY_MAP = new Map();
  const NAME_TO_ID = new Map();

  if (!Array.isArray(keyGroups)) return { KEY_MAP, NAME_TO_ID };

  keyGroups.forEach((group) => {
    group.keys.forEach((key) => {
      if (key && typeof key.id === 'number') {
        const meta = { row: key.row, col: key.col, group: group.group_name, keyId: key.id };
        KEY_MAP.set(key.id, meta);
        if (key.key_name) {
          NAME_TO_ID.set(key.key_name.toUpperCase(), key.id);
        }
      }
    });
  });

  return { KEY_MAP, NAME_TO_ID };
}

return { buildKeyMaps };
