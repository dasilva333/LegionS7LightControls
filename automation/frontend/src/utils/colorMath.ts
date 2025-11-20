export interface Color {
    r: number;
    g: number;
    b: number;
}

export function hsvToRgb(h: number, s: number, v: number): Color {
    const clamp = (num: number) => Math.max(0, Math.min(1, num));
    h = clamp(h);
    s = clamp(s);
    v = clamp(v);
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    let r = 0;
    let g = 0;
    let b = 0;
    switch (i % 6) {
        case 0:
            r = v;
            g = t;
            b = p;
            break;
        case 1:
            r = q;
            g = v;
            b = p;
            break;
        case 2:
            r = p;
            g = v;
            b = t;
            break;
        case 3:
            r = p;
            g = q;
            b = v;
            break;
        case 4:
            r = t;
            g = p;
            b = v;
            break;
        case 5:
            r = v;
            g = p;
            b = q;
            break;
    }
    return { r: Math.floor(r * 255), g: Math.floor(g * 255), b: Math.floor(b * 255) };
}

export function hexToRgb(hex: string): Color {
    if (!hex || typeof hex !== 'string') return { r: 0, g: 0, b: 0 };
    const cleanHex = hex.replace('#', '');
    return {
        r: parseInt(cleanHex.substring(0, 2), 16) || 0,
        g: parseInt(cleanHex.substring(2, 4), 16) || 0,
        b: parseInt(cleanHex.substring(4, 6), 16) || 0
    };
}

export function mix(c1: Color, c2: Color, t: number): Color {
    const clamp = (value: number) => Math.max(0, Math.min(1, value));
    const ratio = clamp(t);
    return {
        r: Math.floor(c1.r + (c2.r - c1.r) * ratio),
        g: Math.floor(c1.g + (c2.g - c1.g) * ratio),
        b: Math.floor(c1.b + (c2.b - c1.b) * ratio)
    };
}
