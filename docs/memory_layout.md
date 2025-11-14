# Memory Layout (Global Hardware Object)

Base pointer: hw = base + 0x7E840

Known offsets (uint32 unless noted):
- +0x154: profile index (GetProfileIndex triplet writes here)
- +0x158: brightness (GetBrightnessLevel triplet writes here)
- +0x1A8: profileId (populated by init_profile_detail or Set operations)
- +0x1B0: vector [begin,end,cap] of 0x50-byte layer entries (if persisted)

Layer entry (size 0x50):
- +0x00: layerId (uint32)
- +0x18: animationId (uint32)
- (Potential additional fields: speed, clockwise, direction, colorType, colorSize, colorList, transition)

Notes:
- On some builds, the "Get" path does not persist profile details into (hw+0x1B0), so both actualId and count may be zero after init_profile_detail and GetProfileDetails. In that case, call the internal JSON builder function to obtain full profile JSON.

