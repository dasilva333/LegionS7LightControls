import React from 'react';
import { IonCard, IonCardContent, IonButton, IonIcon, IonGrid, IonRow, IonCol } from '@ionic/react';
import { refresh, power } from 'ionicons/icons';
import { apiClient } from '../../config/api';

const QuickActions: React.FC = () => {
    const handleReload = async () => {
        try {
            await apiClient.post('/api/godmode', { command: 'enable' });
        } catch (e) {
            console.error('Failed to reload engine', e);
        }
    };

    const handleEmergencyOff = async () => {
        try {
            await apiClient.post('/api/godmode', { command: 'disable' });
        } catch (e) {
            console.error('Failed to disable engine', e);
        }
    };

    return (
        <IonCard>
            <IonCardContent>
                <IonGrid>
                    <IonRow>
                        <IonCol>
                            <IonButton expand="block" fill="outline" onClick={handleReload}>
                                <IonIcon slot="start" icon={refresh} />
                                Reload Engine
                            </IonButton>
                        </IonCol>
                        <IonCol>
                            <IonButton expand="block" color="danger" onClick={handleEmergencyOff}>
                                <IonIcon slot="start" icon={power} />
                                Emergency Off
                            </IonButton>
                        </IonCol>
                    </IonRow>
                </IonGrid>
            </IonCardContent>
        </IonCard>
    );
};

export default QuickActions;
