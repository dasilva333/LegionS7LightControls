import React, { useEffect, useState } from 'react';
import { IonItem, IonLabel, IonSelect, IonSelectOption, IonRange } from '@ionic/react';
import LayerCard from '../../shared/LayerCard';
import { apiClient } from '../../../config/api';
import './AudioFxCard.css';

type AudioFxCardProps = {
  disabled?: boolean;
};

type AudioConfig = {
  enabled?: boolean;
  mode?: 'Ripple' | 'Rows (EQ)' | 'Rows (Loudness)';
  source?: 'Windows Audio' | 'Microphone' | 'Both';
  sensitivity?: number;
  decay?: number;
};

const DEFAULT_CONFIG: AudioConfig = {
  enabled: true,
  mode: 'Ripple',
  source: 'Windows Audio',
  sensitivity: 3.5,
  decay: 0.15
};

const AudioFxCard: React.FC<AudioFxCardProps> = ({ disabled }) => {
  const [enabled, setEnabled] = useState(DEFAULT_CONFIG.enabled!);
  const [mode, setMode] = useState<AudioConfig['mode']>(DEFAULT_CONFIG.mode);
  const [source, setSource] = useState<AudioConfig['source']>(DEFAULT_CONFIG.source);
  const [sensitivity, setSensitivity] = useState<number>(DEFAULT_CONFIG.sensitivity!);
  const [decay, setDecay] = useState<number>(DEFAULT_CONFIG.decay!);
  const [loading, setLoading] = useState(true);
  const widgetId = 'fxAudio';

  const controlsDisabled = disabled || !enabled || loading;

  const persist = async (next: AudioConfig) => {
    const merged = {
      enabled,
      mode,
      source,
      sensitivity,
      decay,
      ...next
    };
    setEnabled(Boolean(merged.enabled));
    if (merged.mode) setMode(merged.mode);
    if (merged.source) setSource(merged.source);
    if (merged.sensitivity) setSensitivity(merged.sensitivity);
    if (merged.decay) setDecay(merged.decay);
    try {
      await apiClient.post(`/api/widgets/${widgetId}`, { config: merged });
    } catch (error) {
      console.error('[AudioFxCard] Failed to persist config', error);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiClient.get<{ config: AudioConfig }>(`/api/widgets/${widgetId}`);
        const cfg = response.config || {};
        setEnabled(cfg.enabled ?? DEFAULT_CONFIG.enabled!);
        setMode(cfg.mode ?? DEFAULT_CONFIG.mode);
        setSource(cfg.source ?? DEFAULT_CONFIG.source);
        setSensitivity(cfg.sensitivity ?? DEFAULT_CONFIG.sensitivity!);
        setDecay(cfg.decay ?? DEFAULT_CONFIG.decay!);
      } catch (error) {
        console.error('[AudioFxCard] Failed to load config', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <LayerCard
      title="Audio Reactive FX"
      description="Lock animations to music or ambient audio."
      toggleState={enabled}
      onToggle={(checked) => persist({ enabled: checked })}
      disabled={disabled}
    >
      <IonItem lines="none" className="audio-card__item">
        <IonLabel position="stacked">Sensitivity ({sensitivity})</IonLabel>
        <IonRange
          min={0.1}
          max={10}
          step={0.1}
          value={sensitivity}
          onIonChange={(e) => persist({ sensitivity: e.detail.value as number })}
          disabled={controlsDisabled}
        />
      </IonItem>
      <IonItem lines="none" className="audio-card__item">
        <IonLabel position="stacked">Decay ({decay})</IonLabel>
        <IonRange
          min={0.01}
          max={1.0}
          step={0.01}
          value={decay}
          onIonChange={(e) => persist({ decay: e.detail.value as number })}
          disabled={controlsDisabled}
        />
      </IonItem>
      <IonItem lines="none" className="audio-card__item">
        <IonLabel position="stacked">Mode</IonLabel>
        <IonSelect
          interface="popover"
          value={mode}
          onIonChange={(event) => persist({ mode: event.detail.value })}
          disabled={controlsDisabled}
        >
          <IonSelectOption value="Ripple">Ripple</IonSelectOption>
          <IonSelectOption value="Rows (EQ)">Rows (EQ)</IonSelectOption>
          <IonSelectOption value="Rows (Loudness)">Rows (Loudness)</IonSelectOption>
        </IonSelect>
      </IonItem>
      <IonItem lines="none" className="audio-card__item">
        <IonLabel position="stacked">Source</IonLabel>
        <IonSelect
          interface="popover"
          value={source}
          onIonChange={(event) => persist({ source: event.detail.value })}
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
