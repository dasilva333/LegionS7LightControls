import React from 'react';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonLabel, IonBadge } from '@ionic/react';
import { GodModeState } from '../../types/GodModeState';

interface LayerStackProps {
    state: GodModeState;
}

const LayerStack: React.FC<LayerStackProps> = ({ state }) => {
    const layers = [
        {
            name: 'FX Layer',
            enabled: true, // Always active if engine is running, effectively
            details: 'Typing / Audio'
        },
        {
            name: 'Interrupts',
            enabled: state.interrupts && Object.keys(state.interrupts).length > 0,
            details: 'Notifications'
        },
        {
            name: 'Widgets',
            enabled: (state.widgets?.dayBar?.enabled || state.widgets?.temperature?.enabled),
            details: 'DayBar / Temp'
        },
        {
            name: 'Background',
            enabled: state.backgroundMode === 'effect',
            details: state.effectSettings?.colorSource || 'None'
        }
    ];

    return (
        <IonCard>
            <IonCardHeader>
                <IonCardTitle style={{ fontSize: '1.1rem' }}>Active Layers</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
                <IonList lines="none">
                    {layers.map((layer, index) => (
                        <IonItem key={index} style={{ opacity: layer.enabled ? 1 : 0.5 }}>
                            <IonLabel>
                                <h3>{layer.name}</h3>
                                <p>{layer.details}</p>
                            </IonLabel>
                            {layer.enabled && <IonBadge color="primary" slot="end">Active</IonBadge>}
                        </IonItem>
                    ))}
                </IonList>
            </IonCardContent>
        </IonCard>
    );
};

export default LayerStack;
