
'use strict';

// ... [PASTE YOUR KEY_GROUPS JSON HERE] ...
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

const TARGET_MODULE = 'Gaming.AdvancedLighting.dll';
const PRIMITIVE_RVA = 0x209b0;

const HEADER_SIZE = 4;
const BYTES_PER_KEY = 5;
const BUFFER_SIZE = 960;

// --- CONFIGURATION ---
const MESSAGE = "LAIN"; // Add spaces at end for padding
const SCROLL_SPEED = 3;        // Lower is faster
const COLOR_FG = { r: 0, g: 255, b: 0 }; // Text Color (Green)
const COLOR_BG = { r: 0, g: 0, b: 0 };   // Background (Black)

// --- 5x3 PIXEL FONT DEFINITION ---
// 1 = On, 0 = Off. 5 Rows high, 3 Cols wide.
const FONT = {
    'A': [1,1,1, 1,0,1, 1,1,1, 1,0,1, 1,0,1],
    'B': [1,1,0, 1,0,1, 1,1,0, 1,0,1, 1,1,0],
    'C': [1,1,1, 1,0,0, 1,0,0, 1,0,0, 1,1,1],
    'D': [1,1,0, 1,0,1, 1,0,1, 1,0,1, 1,1,0],
    'E': [1,1,1, 1,0,0, 1,1,0, 1,0,0, 1,1,1],
    'F': [1,1,1, 1,0,0, 1,1,0, 1,0,0, 1,0,0],
    'G': [1,1,1, 1,0,0, 1,0,1, 1,0,1, 1,1,1],
    'H': [1,0,1, 1,0,1, 1,1,1, 1,0,1, 1,0,1],
    'I': [1,1,1, 0,1,0, 0,1,0, 0,1,0, 1,1,1],
    'J': [0,0,1, 0,0,1, 0,0,1, 1,0,1, 1,1,1],
    'K': [1,0,1, 1,0,1, 1,1,0, 1,0,1, 1,0,1],
    'L': [1,0,0, 1,0,0, 1,0,0, 1,0,0, 1,1,1],
    'M': [1,0,1, 1,1,1, 1,0,1, 1,0,1, 1,0,1],
    'N': [1,1,1, 1,0,1, 1,0,1, 1,0,1, 1,0,1], // Compressed N
    'O': [1,1,1, 1,0,1, 1,0,1, 1,0,1, 1,1,1],
    'P': [1,1,1, 1,0,1, 1,1,1, 1,0,0, 1,0,0],
    'Q': [1,1,1, 1,0,1, 1,0,1, 0,1,0, 0,0,1],
    'R': [1,1,1, 1,0,1, 1,1,0, 1,0,1, 1,0,1],
    'S': [0,1,1, 1,0,0, 1,1,0, 0,0,1, 1,1,0],
    'T': [1,1,1, 0,1,0, 0,1,0, 0,1,0, 0,1,0],
    'U': [1,0,1, 1,0,1, 1,0,1, 1,0,1, 1,1,1],
    'V': [1,0,1, 1,0,1, 1,0,1, 1,0,1, 0,1,0],
    'W': [1,0,1, 1,0,1, 1,0,1, 1,1,1, 1,0,1],
    'X': [1,0,1, 1,0,1, 0,1,0, 1,0,1, 1,0,1],
    'Y': [1,0,1, 1,0,1, 0,1,0, 0,1,0, 0,1,0],
    'Z': [1,1,1, 0,0,1, 0,1,0, 1,0,0, 1,1,1],
    ' ': [0,0,0, 0,0,0, 0,0,0, 0,0,0, 0,0,0]
};

// --- ENGINE LOGIC ---
const KEY_MAP = new Map();
let tick = 0;

function initMap() {
    KEY_GROUPS.forEach(group => {
        group.keys.forEach(k => {
            KEY_MAP.set(k.id, { row: k.row, col: k.col });
        });
    });
}

// Returns true if the pixel at (row, virtualCol) is ON in the text string
function getPixelState(row, virtualCol) {
    // Character dimensions
    const CHAR_WIDTH = 3;
    const SPACER = 1;
    const BLOCK_SIZE = CHAR_WIDTH + SPACER;

    // Find which character in the string corresponds to this column
    const charIndex = Math.floor(virtualCol / BLOCK_SIZE);
    
    // Safety check (Wrap logic handles the scrolling, this handles the string bounds)
    if (charIndex >= MESSAGE.length) return 0;

    const char = MESSAGE[charIndex].toUpperCase();
    const charPixelCol = virtualCol % BLOCK_SIZE;

    // If we are in the "Spacer" column, pixel is off
    if (charPixelCol === 3) return 0;

    // Get Font Data
    const glyph = FONT[char] || FONT[' '];
    
    // The glyph is a 1D array of 15 items (5 rows * 3 cols)
    // Index = (row * 3) + col
    const glyphIndex = (row * 3) + charPixelCol;

    // Safety: Font is only 5 rows high. If row > 4, return 0.
    if (row > 4) return 0;

    return glyph[glyphIndex];
}

function main() {
    const module = Process.getModuleByName(TARGET_MODULE);
    if (!module) {
        setTimeout(main, 1000);
        return;
    }
    
    initMap();

    const targetAddr = module.base.add(PRIMITIVE_RVA);
    console.log(`[+] Hooking Primitive at ${targetAddr}`);
    console.log(`[+] GOD MODE: TICKER TAPE ENGAGED: "${MESSAGE}"`);

    Interceptor.attach(targetAddr, {
        onEnter(args) {
            const bufferInfoPtr = args[2];
            if (bufferInfoPtr.isNull()) return;
            const dataPtr = bufferInfoPtr.readPointer();
            if (dataPtr.isNull()) return;

            const h0 = dataPtr.readU8();
            const h1 = dataPtr.add(1).readU8();

            if (h0 === 0x07 && h1 === 0xA1) {
                tick++;
                
                // Calculate Scroll Offset
                // Text moves LEFT, so we ADD to the sampling index
                const totalTextWidth = MESSAGE.length * 4; // 4 cols per char
                const frameOffset = Math.floor(tick / SCROLL_SPEED);
                
                let cursor = dataPtr.add(HEADER_SIZE);
                const limit = dataPtr.add(BUFFER_SIZE - BYTES_PER_KEY);

                while (cursor < limit) {
                    const keyId = cursor.readU16();
                    
                    if (keyId !== 0) {
                        const pos = KEY_MAP.get(keyId);
                        
                        let r = 0, g = 0, b = 0;

                        if (pos) {
                            // MAPPING LOGIC:
                            // We map the physical column (0-21) to the virtual text buffer
                            // We add the frameOffset to scroll.
                            // We Modulo (%) by totalTextWidth to wrap around.
                            
                            const virtualCol = (pos.col + frameOffset) % totalTextWidth;
                            
                            const pixelOn = getPixelState(pos.row, virtualCol);

                            if (pixelOn) {
                                r = COLOR_FG.r; g = COLOR_FG.g; b = COLOR_FG.b;
                            } else {
                                r = COLOR_BG.r; g = COLOR_BG.g; b = COLOR_BG.b;
                            }
                        }

                        cursor.add(2).writeU8(r);
                        cursor.add(3).writeU8(g);
                        cursor.add(4).writeU8(b);
                    }
                    cursor = cursor.add(BYTES_PER_KEY);
                }
            }
        }
    });
}

setImmediate(main);