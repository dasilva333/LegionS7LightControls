export type Mode = "none" | "effect";
export type EffectType = "Solid" | "Ripple" | "Wave" | "Fade" | "Checkerboard" | "Sonar" | "Raindrops" | "Heatmap";
export type ColorSource = "Static" | "Time of Day" | "Spectrum";

export type GodModeState = {
    active?: boolean;
    mode?: 'DEFAULT' | 'PASSTHROUGH';
    backgroundMode?: Mode;
    timeOfDay?: number;
    weather?: string;
    widgets?: {
        temperature?: {
            enabled: boolean;
            value?: number;
        };
        dayBar?: {
            enabled: boolean;
        };
        [key: string]: any;
    };
    effectSettings?: {
        effectType?: string;
        colorSource?: string;
        baseColor?: string;
        speed?: number;
    };
    interrupts?: {
        [key: string]: any;
    };
};
