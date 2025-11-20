import React, { useState, useEffect } from 'react';
import {
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonItem,
    IonLabel,
    IonDatetime,
    IonGrid,
    IonRow,
    IonCol
} from '@ionic/react';
import ColorPicker from '../../shared/ColorPicker';

export type GradientData = {
    id?: number;
    startTime: string;
    endTime: string;
    startRgb: string;
    endRgb: string;
};

type GradientModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: GradientData) => void;
    initialGradient: GradientData | null;
};

const GradientModal: React.FC<GradientModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialGradient
}) => {
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [startColor, setStartColor] = useState('#000000');
    const [endColor, setEndColor] = useState('#000000');

    useEffect(() => {
        if (isOpen) {
            if (initialGradient) {
                setStartTime(initialGradient.startTime);
                setEndTime(initialGradient.endTime);
                setStartColor(initialGradient.startRgb);
                setEndColor(initialGradient.endRgb);
            } else {
                // Defaults for new gradient
                setStartTime('09:00');
                setEndTime('17:00');
                setStartColor('#0000FF');
                setEndColor('#FF0000');
            }
        }
    }, [isOpen, initialGradient]);

    const handleSave = () => {
        onSave({
            id: initialGradient?.id,
            startTime,
            endTime,
            startRgb: startColor,
            endRgb: endColor
        });
        onClose();
    };

    return (
        <IonModal isOpen={isOpen} onDidDismiss={onClose}>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>{initialGradient ? 'Edit Gradient' : 'New Gradient'}</IonTitle>
                    <IonButtons slot="end">
                        <IonButton onClick={onClose}>Cancel</IonButton>
                        <IonButton strong onClick={handleSave}>Save</IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
                <IonGrid>
                    <IonRow>
                        <IonCol>
                            <IonItem lines="none">
                                <IonLabel position="stacked">Start Time</IonLabel>
                                <IonDatetime
                                    presentation="time"
                                    value={startTime}
                                    onIonChange={e => setStartTime(Array.isArray(e.detail.value) ? e.detail.value[0]! : e.detail.value!)}
                                    style={{ margin: '0 auto' }}
                                />
                            </IonItem>
                        </IonCol>
                        <IonCol>
                            <IonItem lines="none">
                                <IonLabel position="stacked">End Time</IonLabel>
                                <IonDatetime
                                    presentation="time"
                                    value={endTime}
                                    onIonChange={e => setEndTime(Array.isArray(e.detail.value) ? e.detail.value[0]! : e.detail.value!)}
                                    style={{ margin: '0 auto' }}
                                />
                            </IonItem>
                        </IonCol>
                    </IonRow>
                    <IonRow>
                        <IonCol>
                            <IonItem lines="none">
                                <IonLabel position="stacked">Start Color</IonLabel>
                                <ColorPicker value={startColor} onChange={setStartColor} />
                            </IonItem>
                        </IonCol>
                        <IonCol>
                            <IonItem lines="none">
                                <IonLabel position="stacked">End Color</IonLabel>
                                <ColorPicker value={endColor} onChange={setEndColor} />
                            </IonItem>
                        </IonCol>
                    </IonRow>
                </IonGrid>

                <div style={{
                    marginTop: '2rem',
                    height: '40px',
                    borderRadius: '8px',
                    background: `linear-gradient(to right, ${startColor}, ${endColor})`,
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)'
                }} />

            </IonContent>
        </IonModal>
    );
};

export default GradientModal;
