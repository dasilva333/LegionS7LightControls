import React, { useMemo } from 'react';
import { IonCard, IonCardContent } from '@ionic/react';
import { GodModeState } from '../../types/GodModeState';
import KEY_GROUPS from '../../fixtures/keyGroups.json';
import { hexToRgb, mix } from '../../utils/colorMath';
import { apiClient } from '../../config/api';

interface VirtualKeyboardProps {
    state: GodModeState;
}

// Types for Gradient Data (matching BackgroundCard)
type GradientResponse = {
    id: number;
    startTime: string;
    endTime: string;
    startRgb: string;
    endRgb: string;
    start_time?: string;
    end_time?: string;
    start_rgb?: string;
    end_rgb?: string;
};

const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ state }) => {
    // We need to fetch gradients to render the Time of Day effect correctly
    // For now, we might need to pass them as props or fetch them here.
    // Ideally, Dashboard should fetch everything, but to keep it simple let's just fetch gradients once.
    const [gradients, setGradients] = React.useState<GradientResponse[]>([]);

    React.useEffect(() => {
        apiClient.get<GradientResponse[]>('/time-gradients').then((data: GradientResponse[]) => {
            // Normalize data
            const normalized = data.map((g: GradientResponse) => ({
                id: g.id,
                startTime: g.start_time || g.startTime,
                endTime: g.end_time || g.endTime,
                startRgb: g.start_rgb || g.startRgb,
                endRgb: g.end_rgb || g.endRgb
            }));
            setGradients(normalized);
        }).catch((e: any) => console.error("Failed to fetch gradients for visualizer", e));
    }, []);

    // --- Render Pipeline ---
    const getKeyColor = (keyId: number, row: number, col: number) => {
        let color = { r: 0, g: 0, b: 0 };

        // 1. Background Layer
        if (state.backgroundMode === 'effect') {
            const settings = state.effectSettings;
            if (settings?.colorSource === 'Static') {
                color = hexToRgb(settings.baseColor || '#000000');
            } else if (settings?.colorSource === 'Time of Day') {
                // Calculate Gradient
                const time = state.timeOfDay || 0; // 0.0 to 1.0

                // Find active gradient
                const activeGradient = gradients.find(g => {
                    const parseTime = (t: string) => {
                        const [h, m] = t.split(':').map(Number);
                        return (h * 60 + m) / (24 * 60);
                    };
                    const start = parseTime(g.startTime);
                    const end = parseTime(g.endTime);

                    if (start <= end) return time >= start && time < end;
                    return time >= start || time < end;
                });

                if (activeGradient) {
                    const c1 = hexToRgb(activeGradient.startRgb);
                    const c2 = hexToRgb(activeGradient.endRgb);
                    // Simple mix for now (not perfect time interpolation, just 50/50 or based on range?)
                    // To do it properly we need range interpolation.
                    // For this MVP, let's just show start color or a mix.
                    color = mix(c1, c2, 0.5);
                }
            }
        }

        // 2. Widgets Layer
        // DayBar (F-Keys: Row 0)
        if (state.widgets?.dayBar?.enabled && row === 0) {
            // Simple visualization: DayBar overrides row 0
            // We could implement the actual daybar logic (progress bar)
            // For now, let's just tint it slightly to show it's active
            color = { r: 0, g: 100, b: 255 };
        }

        // Temperature (F-Keys specific) - Not fully implemented in visualizer yet

        return `rgb(${color.r}, ${color.g}, ${color.b})`;
    };

    // Flatten keys for rendering
    const keys = useMemo(() => {
        const allKeys: any[] = [];
        KEY_GROUPS.forEach(group => {
            group.keys.forEach(k => {
                allKeys.push({ ...k, group: group.group_name });
            });
        });
        return allKeys;
    }, []);

    return (
        <IonCard className="virtual-keyboard">
            <IonCardContent>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(22, 1fr)', // 22 Cols standard
                    gridTemplateRows: 'repeat(6, 1fr)',    // 6 Rows standard
                    gap: '4px',
                    aspectRatio: '22/6'
                }}>
                    {keys.map((k) => (
                        <div
                            key={k.id}
                            style={{
                                gridColumnStart: k.col + 1,
                                gridColumnEnd: k.col + 1 + (k.width || 1),
                                gridRowStart: k.row + 1,
                                gridRowEnd: k.row + 1 + (k.height || 1),
                                backgroundColor: getKeyColor(k.id, k.row, k.col),
                                borderRadius: '4px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                transition: 'background-color 0.2s ease'
                            }}
                            title={`Key: ${k.key_name} (${k.id})`}
                        >
                            {k.key_name.substring(0, 3)}
                        </div>
                    ))}
                </div>
            </IonCardContent>
        </IonCard>
    );
};

export default VirtualKeyboard;
