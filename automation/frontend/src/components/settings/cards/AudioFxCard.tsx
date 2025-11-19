import React, { useState } from 'react';
import { IonItem, IonLabel, IonSelect, IonSelectOption } from '@ionic/react';
import LayerCard from '../../shared/LayerCard';
import './AudioFxCard.css';

type AudioFxCardProps = {
  disabled?: boolean;
};

const AudioFxCard: React.FC<AudioFxCardProps> = ({ disabled }) => {
  const [enabled, setEnabled] = useState(true);
  const [mode, setMode] = useState<'Ripple' | 'Rows (EQ)'>('Ripple');
  const [source, setSource] = useState<'Windows Audio' | 'Microphone' | 'Both'>('Windows Audio');

  const controlsDisabled = disabled || !enabled;

  return (
    <LayerCard
      title="Audio Reactive FX"
      description="Lock animations to music or ambient audio."
      toggleState={enabled}
      onToggle={setEnabled}
      disabled={disabled}
    >
      <IonItem lines="none" className="audio-card__item">
        <IonLabel position="stacked">Mode</IonLabel>
        <IonSelect
          interface="popover"
          value={mode}
          onIonChange={(event) => setMode(event.detail.value)}
          disabled={controlsDisabled}
        >
          <IonSelectOption value="Ripple">Ripple</IonSelectOption>
          <IonSelectOption value="Rows (EQ)">Rows (EQ)</IonSelectOption>
        </IonSelect>
      </IonItem>
      <IonItem lines="none" className="audio-card__item">
        <IonLabel position="stacked">Source</IonLabel>
        <IonSelect
          interface="popover"
          value={source}
          onIonChange={(event) => setSource(event.detail.value)}
          disabled={controlsDisabled}
        >
          <IonSelectOption value="Windows Audio">Windows Audio</IonSelectOption>
          <IonSelectOption value="Microphone">Microphone</IonSelectOption>
          <IonSelectOption value="Both">Both</IonSelectOption>
        </IonSelect>
      </IonItem>
    </LayerCard>
  );
};

export default AudioFxCard;
