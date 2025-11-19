import React, { useEffect, useState } from 'react';
import { IonCheckbox, IonItem, IonLabel, IonNote } from '@ionic/react';
import LayerCard from '../../shared/LayerCard';
import KeyPicker from '../../shared/KeyPicker';
import ColorPicker from '../../shared/ColorPicker';
import { apiClient } from '../../../config/api';
import './ProgressBarCard.css';

type ProgressBarCardProps = {
  disabled?: boolean;
};

type ProgressBarConfig = {
  enabled?: boolean;
  startKey?: number;
  endKey?: number;
  startColor?: string;
  endColor?: string;
  restEndpointEnabled?: boolean;
  socketEnabled?: boolean;
};

const DEFAULT_CONFIG: ProgressBarConfig = {
  enabled: true,
  startColor: '#00FF9D',
  endColor: '#FF3B6D',
  restEndpointEnabled: true,
  socketEnabled: true
};

const ProgressBarCard: React.FC<ProgressBarCardProps> = ({ disabled }) => {
  const [enabled, setEnabled] = useState(DEFAULT_CONFIG.enabled!);
  const [startKey, setStartKey] = useState<number | undefined>();
  const [endKey, setEndKey] = useState<number | undefined>();
  const [startColor, setStartColor] = useState(DEFAULT_CONFIG.startColor!);
  const [endColor, setEndColor] = useState(DEFAULT_CONFIG.endColor!);
  const [restEndpointEnabled, setRestEndpointEnabled] = useState(DEFAULT_CONFIG.restEndpointEnabled!);
  const [socketEnabled, setSocketEnabled] = useState(DEFAULT_CONFIG.socketEnabled!);
  const [loading, setLoading] = useState(true);

  const widgetId = 'progress_bar';

  const controlsDisabled = disabled || !enabled || loading;

  const persist = async (overrides: ProgressBarConfig) => {
    const nextConfig = {
      enabled,
      startKey,
      endKey,
      startColor,
      endColor,
      restEndpointEnabled,
      socketEnabled,
      ...overrides
    };
    setEnabled(nextConfig.enabled ?? enabled);
    if (typeof nextConfig.startKey === 'number') setStartKey(nextConfig.startKey);
    if (typeof nextConfig.endKey === 'number') setEndKey(nextConfig.endKey);
    if (nextConfig.startColor) setStartColor(nextConfig.startColor);
    if (nextConfig.endColor) setEndColor(nextConfig.endColor);
    if (typeof nextConfig.restEndpointEnabled === 'boolean')
      setRestEndpointEnabled(nextConfig.restEndpointEnabled);
    if (typeof nextConfig.socketEnabled === 'boolean') setSocketEnabled(nextConfig.socketEnabled);
    try {
      await apiClient.post(`/api/widgets/${widgetId}`, { config: nextConfig });
    } catch (error) {
      console.error('[ProgressBarCard] Failed to persist config', error);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiClient.get<{ config: ProgressBarConfig }>(`/api/widgets/${widgetId}`);
        const cfg = response.config || {};
        setEnabled(cfg.enabled ?? DEFAULT_CONFIG.enabled!);
        setStartKey(cfg.startKey);
        setEndKey(cfg.endKey);
        setStartColor(cfg.startColor ?? DEFAULT_CONFIG.startColor!);
        setEndColor(cfg.endColor ?? DEFAULT_CONFIG.endColor!);
        setRestEndpointEnabled(cfg.restEndpointEnabled ?? DEFAULT_CONFIG.restEndpointEnabled!);
        setSocketEnabled(cfg.socketEnabled ?? DEFAULT_CONFIG.socketEnabled!);
      } catch (error) {
        console.error('[ProgressBarCard] Failed to load config', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleKeyChange = (value: number | number[] | undefined, setter: (key?: number) => void) => {
    const nextValue = Array.isArray(value) ? value[0] ?? undefined : value;
    setter(nextValue);
    if (setter === setStartKey) {
      persist({ startKey: nextValue });
    } else {
      persist({ endKey: nextValue });
    }
  };

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    persist({ enabled: checked });
  };

  return (
    <LayerCard
      title="Universal Progress Bar"
      description="Light a continuous bar between two keys for interrupts (downloads, installs, etc.)."
      toggleState={enabled}
      onToggle={handleToggle}
      disabled={disabled}
    >
      <div className="progress-card__row">
        <KeyPicker
          label="Start Key"
          multiple={false}
          value={startKey}
          onChange={(value) => handleKeyChange(value, setStartKey)}
          disabled={controlsDisabled}
        />
        <KeyPicker
          label="End Key"
          multiple={false}
          value={endKey}
          onChange={(value) => handleKeyChange(value, setEndKey)}
          disabled={controlsDisabled}
        />
      </div>
      <div className="progress-card__row">
        <ColorPicker
          value={startColor}
          onChange={(value) => persist({ startColor: value })}
          disabled={controlsDisabled}
        />
        <ColorPicker
          value={endColor}
          onChange={(value) => persist({ endColor: value })}
          disabled={controlsDisabled}
        />
      </div>
      <IonNote color="medium">
        Colors interpolate from the start key to end key to show current progress.
      </IonNote>
      <IonItem lines="none">
        <IonLabel>REST Endpoint</IonLabel>
        <IonCheckbox
          slot="end"
          checked={restEndpointEnabled}
          onIonChange={(event) => {
            const checked = event.detail.checked;
            setRestEndpointEnabled(checked);
            persist({ restEndpointEnabled: checked });
          }}
          disabled={controlsDisabled}
        />
      </IonItem>
      <IonItem lines="none">
        <IonLabel>Socket.io Broadcast</IonLabel>
        <IonCheckbox
          slot="end"
          checked={socketEnabled}
          onIonChange={(event) => {
            const checked = event.detail.checked;
            setSocketEnabled(checked);
            persist({ socketEnabled: checked });
          }}
          disabled={controlsDisabled}
        />
      </IonItem>
    </LayerCard>
  );
};

export default ProgressBarCard;
