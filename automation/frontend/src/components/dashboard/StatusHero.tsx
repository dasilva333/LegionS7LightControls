import React from 'react';
import { IonCard, IonCardContent, IonText, IonIcon } from '@ionic/react';
import { ellipse } from 'ionicons/icons';
import { GodModeState } from '../../types/GodModeState';

interface StatusHeroProps {
    state: GodModeState;
}

const StatusHero: React.FC<StatusHeroProps> = ({ state }) => {
    const isActive = state.active;
    const isPassthrough = state.mode === 'PASSTHROUGH';

    let statusColor = 'danger';
    let statusText = 'ENGINE DISABLED';

    if (isActive) {
        if (isPassthrough) {
            statusColor = 'warning';
            statusText = 'PASSTHROUGH MODE';
        } else {
            statusColor = 'success';
            statusText = 'ENGINE ACTIVE';
        }
    }

    const weather = state.weather || 'Unknown';
    const temp = state.widgets?.temperature?.value ? `${state.widgets.temperature.value}°F` : '--°F';

    return (
        <IonCard className="status-hero">
            <IonCardContent style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <IonIcon icon={ellipse} color={statusColor} style={{ fontSize: '12px' }} />
                    <IonText color="dark" style={{ fontWeight: 'bold', letterSpacing: '1px' }}>
                        {statusText}
                    </IonText>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <IonText color="medium" style={{ fontSize: '0.9rem', display: 'block' }}>
                        Weather: {weather}
                    </IonText>
                    <IonText color="medium" style={{ fontSize: '0.9rem', display: 'block' }}>
                        Temp: {temp}
                    </IonText>
                </div>
            </IonCardContent>
        </IonCard>
    );
};

export default StatusHero;
