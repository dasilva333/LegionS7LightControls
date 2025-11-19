'use strict';

const TARGET_MODULE = 'Gaming.AdvancedLighting.dll';
const PRIMITIVE_RVA = 0x209b0;

const HEADER_SIZE = 4;     
const BYTES_PER_KEY = 5;   
const BUFFER_SIZE = 960;

// Animation State
let tick = 0;
const SPEED = 30; // Toggle every ~30 frames

// --- 1. SPATIAL DATA (Paste your JSON here) ---
const KEY_GROUPS = [
  {
    "group_name": "Function Row (Top)",
    "keys": [
      { "id": 1, "key_name": "Esc", "row": 0, "col": 0 },
      { "id": 2, "key_name": "F1", "row": 0, "col": 2 },
      { "id": 3, "key_name": "F2", "row": 0, "col": 3 },
      { "id": 4, "key_name": "F3", "row": 0, "col": 4 },
      { "id": 5, "key_name": "F4", "row": 0, "col": 5 },
      { "id": 6, "key_name": "F5", "row": 0, "col": 6 },
      { "id": 7, "key_name": "F6", "row": 0, "col": 7 },
      { "id": 8, "key_name": "F7", "row": 0, "col": 8 },
      { "id": 9, "key_name": "F8", "row": 0, "col": 9 },
      { "id": 10, "key_name": "F9", "row": 0, "col": 10 },
      { "id": 11, "key_name": "F10", "row": 0, "col": 11 },
      { "id": 12, "key_name": "F11", "row": 0, "col": 12 },
      { "id": 13, "key_name": "F12", "row": 0, "col": 13 },
      { "id": 14, "key_name": "Insert", "row": 0, "col": 15 },
      { "id": 15, "key_name": "PrtSc", "row": 0, "col": 16 },
      { "id": 16, "key_name": "Delete", "row": 0, "col": 17 }
    ]
  },
  {
    "group_name": "Navigation Cluster (Top Right)",
    "keys": [
      { "id": 17, "key_name": "Home", "row": 0, "col": 18 },
      { "id": 18, "key_name": "End", "row": 0, "col": 19 },
      { "id": 19, "key_name": "PgUp", "row": 0, "col": 20 },
      { "id": 20, "key_name": "PgDn", "row": 0, "col": 21 }
    ]
  },
  {
    "group_name": "Number Row",
    "keys": [
      { "id": 22, "key_name": "~ (Tilde)", "row": 1, "col": 0 },
      { "id": 23, "key_name": "1", "row": 1, "col": 1 },
      { "id": 24, "key_name": "2", "row": 1, "col": 2 },
      { "id": 25, "key_name": "3", "row": 1, "col": 3 },
      { "id": 26, "key_name": "4", "row": 1, "col": 4 },
      { "id": 27, "key_name": "5", "row": 1, "col": 5 },
      { "id": 28, "key_name": "6", "row": 1, "col": 6 },
      { "id": 29, "key_name": "7", "row": 1, "col": 7 },
      { "id": 30, "key_name": "8", "row": 1, "col": 8 },
      { "id": 31, "key_name": "9", "row": 1, "col": 9 },
      { "id": 32, "key_name": "0", "row": 1, "col": 10 },
      { "id": 33, "key_name": "- (Minus)", "row": 1, "col": 11 },
      { "id": 34, "key_name": "= (Equals)", "row": 1, "col": 12 },
      { "id": 56, "key_name": "Backspace", "row": 1, "col": 13 }
    ]
  },
  {
    "group_name": "Alpha Block (Top: QWERTY)",
    "keys": [
      { "id": 64, "key_name": "Tab", "row": 2, "col": 0 },
      { "id": 66, "key_name": "Q", "row": 2, "col": 1 },
      { "id": 67, "key_name": "W", "row": 2, "col": 2 },
      { "id": 68, "key_name": "E", "row": 2, "col": 3 },
      { "id": 69, "key_name": "R", "row": 2, "col": 4 },
      { "id": 70, "key_name": "T", "row": 2, "col": 5 },
      { "id": 71, "key_name": "Y", "row": 2, "col": 6 },
      { "id": 72, "key_name": "U", "row": 2, "col": 7 },
      { "id": 73, "key_name": "I", "row": 2, "col": 8 },
      { "id": 74, "key_name": "O", "row": 2, "col": 9 },
      { "id": 75, "key_name": "P", "row": 2, "col": 10 },
      { "id": 76, "key_name": "[", "row": 2, "col": 11 },
      { "id": 77, "key_name": "]", "row": 2, "col": 12 },
      { "id": 78, "key_name": "\\ (Backslash)", "row": 2, "col": 13 }
    ]
  },
  {
    "group_name": "Alpha Block (Middle: ASDF)",
    "keys": [
      { "id": 85, "key_name": "Caps Lock", "row": 3, "col": 0 },
      { "id": 109, "key_name": "A", "row": 3, "col": 1 },
      { "id": 110, "key_name": "S", "row": 3, "col": 2 },
      { "id": 88, "key_name": "D", "row": 3, "col": 3 },
      { "id": 89, "key_name": "F", "row": 3, "col": 4 },
      { "id": 90, "key_name": "G", "row": 3, "col": 5 },
      { "id": 113, "key_name": "H", "row": 3, "col": 6 },
      { "id": 114, "key_name": "J", "row": 3, "col": 7 },
      { "id": 91, "key_name": "K", "row": 3, "col": 8 },
      { "id": 92, "key_name": "L", "row": 3, "col": 9 },
      { "id": 93, "key_name": "; (Semicolon)", "row": 3, "col": 10 },
      { "id": 95, "key_name": "' (Quote)", "row": 3, "col": 11 },
      { "id": 119, "key_name": "Enter", "row": 3, "col": 13 }
    ]
  },
  {
    "group_name": "Alpha Block (Bottom: ZXCV)",
    "keys": [
      { "id": 106, "key_name": "Left Shift", "row": 4, "col": 0 },
      { "id": 130, "key_name": "Z", "row": 4, "col": 2 },
      { "id": 131, "key_name": "X", "row": 4, "col": 3 },
      { "id": 111, "key_name": "C", "row": 4, "col": 4 },
      { "id": 112, "key_name": "V", "row": 4, "col": 5 },
      { "id": 135, "key_name": "B", "row": 4, "col": 6 },
      { "id": 136, "key_name": "N", "row": 4, "col": 7 },
      { "id": 115, "key_name": "M", "row": 4, "col": 8 },
      { "id": 116, "key_name": ", (Comma)", "row": 4, "col": 9 },
      { "id": 117, "key_name": ". (Period)", "row": 4, "col": 10 },
      { "id": 118, "key_name": "/ (Slash)", "row": 4, "col": 11 },
      { "id": 141, "key_name": "Right Shift", "row": 4, "col": 13 }
    ]
  },
  {
    "group_name": "Bottom Modifiers & Arrows",
    "keys": [
      { "id": 127, "key_name": "Left Ctrl", "row": 5, "col": 0 },
      { "id": 128, "key_name": "Fn", "row": 5, "col": 1 },
      { "id": 150, "key_name": "Left Win", "row": 5, "col": 2 },
      { "id": 151, "key_name": "Left Alt", "row": 5, "col": 3 },
      { "id": 152, "key_name": "Space", "row": 5, "col": 6 },
      { "id": 154, "key_name": "Right Alt", "row": 5, "col": 10 },
      { "id": 155, "key_name": "Menu / R-Ctrl", "row": 5, "col": 11 },
      { "id": 156, "key_name": "Left Arrow", "row": 5, "col": 15 },
      { "id": 157, "key_name": "Up Arrow", "row": 4, "col": 16 },
      { "id": 159, "key_name": "Down Arrow", "row": 5, "col": 16 },
      { "id": 161, "key_name": "Right Arrow", "row": 5, "col": 17 }
    ]
  },
  {
    "group_name": "Numpad",
    "keys": [
      { "id": 38, "key_name": "Num Lock", "row": 1, "col": 18 },
      { "id": 39, "key_name": "Num /", "row": 1, "col": 19 },
      { "id": 40, "key_name": "Num *", "row": 1, "col": 20 },
      { "id": 41, "key_name": "Num -", "row": 1, "col": 21 },
      { "id": 79, "key_name": "Num 7", "row": 2, "col": 18 },
      { "id": 80, "key_name": "Num 8", "row": 2, "col": 19 },
      { "id": 81, "key_name": "Num 9", "row": 2, "col": 20 },
      { "id": 104, "key_name": "Num +", "row": 2, "col": 21 },
      { "id": 121, "key_name": "Num 4", "row": 3, "col": 18 },
      { "id": 123, "key_name": "Num 5", "row": 3, "col": 19 },
      { "id": 124, "key_name": "Num 6", "row": 3, "col": 20 },
      { "id": 142, "key_name": "Num 1", "row": 4, "col": 18 },
      { "id": 144, "key_name": "Num 2", "row": 4, "col": 19 },
      { "id": 146, "key_name": "Num 3", "row": 4, "col": 20 },
      { "id": 163, "key_name": "Num 0", "row": 5, "col": 19 },
      { "id": 165, "key_name": "Num .", "row": 5, "col": 20 },
      { "id": 167, "key_name": "Num Enter", "row": 4, "col": 21 }
    ]
  }
];

// --- 2. LOOKUP GENERATION ---
const KEY_MAP = new Map();

function initMap() {
    KEY_GROUPS.forEach(group => {
        group.keys.forEach(k => {
            // Map Key ID to position {row, col}
            KEY_MAP.set(k.id, { row: k.row, col: k.col });
        });
    });
    console.log(`[+] Key Map Initialized. Loaded ${KEY_MAP.size} keys.`);
}


// --- 3. GOD MODE HOOK ---
// --- 3. GOD MODE HOOK (Revised: Red/Blue Swap) ---
function main() {
    const module = Process.getModuleByName(TARGET_MODULE);
    if (!module) {
        setTimeout(main, 1000);
        return;
    }
    
    initMap();

    const targetAddr = module.base.add(PRIMITIVE_RVA);
    console.log(`[+] Hooking Primitive at ${targetAddr}`);
    console.log(`[+] GOD MODE: RED/BLUE CHECKERBOARD`);

    Interceptor.attach(targetAddr, {
        onEnter(args) {
            const bufferInfoPtr = args[2];
            if (bufferInfoPtr.isNull()) return;
            const dataPtr = bufferInfoPtr.readPointer();
            if (dataPtr.isNull()) return;

            // Verify Aurora Sync Packet
            const h0 = dataPtr.readU8();
            const h1 = dataPtr.add(1).readU8();

            if (h0 === 0x07 && h1 === 0xA1) {
                tick++;
                
                // Swap colors every 30 frames (~0.5 seconds)
                // 0 = Red/Blue, 1 = Blue/Red
                const swapState = Math.floor(tick / 30) % 2;

                let cursor = dataPtr.add(HEADER_SIZE);
                const limit = dataPtr.add(BUFFER_SIZE - BYTES_PER_KEY);

                while (cursor < limit) {
                    const keyId = cursor.readU16();
                    
                    if (keyId !== 0) {
                        const pos = KEY_MAP.get(keyId);
                        
                        if (pos) {
                            // Calculate Geometry
                            const isEven = (pos.row + pos.col) % 2 === 0;
                            
                            // Determine Color Assignment
                            // If swapState is 0: Even gets Color A, Odd gets Color B
                            // If swapState is 1: Even gets Color B, Odd gets Color A
                            const useColorA = (swapState === 0) ? isEven : !isEven;

                            if (useColorA) {
                                // COLOR A: RED
                                cursor.add(2).writeU8(255);
                                cursor.add(3).writeU8(0);
                                cursor.add(4).writeU8(0);
                            } else {
                                // COLOR B: BLUE
                                cursor.add(2).writeU8(0);
                                cursor.add(3).writeU8(0);
                                cursor.add(4).writeU8(255);
                            }
                        } else {
                            // Unknown keys: Turn OFF (Black)
                            cursor.add(2).writeU8(0);
                            cursor.add(3).writeU8(0);
                            cursor.add(4).writeU8(0);
                        }
                    }
                    cursor = cursor.add(BYTES_PER_KEY);
                }
            }
        }
    });
}

setImmediate(main);