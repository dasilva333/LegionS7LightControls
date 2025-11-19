import React, { useEffect, useState } from 'react';
import { IonItem, IonLabel, IonSelect, IonSelectOption } from '@ionic/react';
import LayerCard from '../../shared/LayerCard';
import { apiClient } from '../../../config/api';
import './AudioFxCard.css';

type AudioFxCardProps = {
  disabled?: boolean;
};

type AudioConfig = {
  enabled?: boolean;
  mode?: 'Ripple' | 'Rows (EQ)';
  source?: 'Windows Audio' | 'Microphone' | 'Both';
};

const DEFAULT_CONFIG: AudioConfig = {
  enabled: true,
  mode: 'Ripple',
  source: 'Windows Audio'
};

const AudioFxCard: React.FC<AudioFxCardProps> = ({ disabled }) => {
  const [enabled, setEnabled] = useState(DEFAULT_CONFIG.enabled!);
  const [mode, setMode] = useState<AudioConfig['mode']>(DEFAULT_CONFIG.mode);
  const [source, setSource] = useState<AudioConfig['source']>(DEFAULT_CONFIG.source);
  const [loading, setLoading] = useState(true);
  const widgetId = 'fx_audio';

  const controlsDisabled = disabled || !enabled || loading;

  const persist = async (next: AudioConfig) => {
    const merged = {
      enabled,
      mode,
      source,
      ...next
    };
    setEnabled(Boolean(merged.enabled));
    if (merged.mode) setMode(merged.mode);
    if (merged.source) setSource(merged.source);
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
        <IonLabel position="stacked">Mode</IonLabel>
        <IonSelect
          interface="popover"
          value={mode}
          onIonChange={(event) => persist({ mode: event.detail.value })}
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
