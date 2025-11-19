import React, { useEffect, useState } from 'react';
import { IonItem, IonInput, IonLabel, IonNote } from '@ionic/react';
import LayerCard from '../../shared/LayerCard';
import ColorPicker from '../../shared/ColorPicker';
import KeyPicker from '../../shared/KeyPicker';
import { apiClient } from '../../../config/api';
import './TemperatureCard.css';

type TemperatureCardProps = {
  disabled?: boolean;
};

type TemperatureConfig = {
  enabled?: boolean;
  lowTemp?: number;
  highTemp?: number;
  lowColor?: string;
  highColor?: string;
  targetKeys?: number[];
};

const DEFAULT_CONFIG: TemperatureConfig = {
  enabled: true,
  lowTemp: 30,
  highTemp: 100,
  lowColor: '#00A3FF',
  highColor: '#FF4D4D',
  targetKeys: []
};

const TemperatureCard: React.FC<TemperatureCardProps> = ({ disabled }) => {
  const [enabled, setEnabled] = useState(DEFAULT_CONFIG.enabled!);
  const [lowTemp, setLowTemp] = useState(DEFAULT_CONFIG.lowTemp!);
  const [highTemp, setHighTemp] = useState(DEFAULT_CONFIG.highTemp!);
  const [lowColor, setLowColor] = useState(DEFAULT_CONFIG.lowColor!);
  const [highColor, setHighColor] = useState(DEFAULT_CONFIG.highColor!);
  const [targetKeys, setTargetKeys] = useState<number[]>(DEFAULT_CONFIG.targetKeys || []);
  const [loading, setLoading] = useState(true);

  const widgetId = 'temperature';

  const controlsDisabled = disabled || !enabled || loading;

  const persist = async (overrides: TemperatureConfig) => {
    const nextConfig = {
      enabled,
      lowTemp,
      highTemp,
      lowColor,
      highColor,
      targetKeys,
      ...overrides
    };
    setEnabled(nextConfig.enabled ?? enabled);
    if (typeof nextConfig.lowTemp === 'number') setLowTemp(nextConfig.lowTemp);
    if (typeof nextConfig.highTemp === 'number') setHighTemp(nextConfig.highTemp);
    if (nextConfig.lowColor) setLowColor(nextConfig.lowColor);
    if (nextConfig.highColor) setHighColor(nextConfig.highColor);
    if (Array.isArray(nextConfig.targetKeys)) setTargetKeys(nextConfig.targetKeys);
    try {
      await apiClient.post(`/api/widgets/${widgetId}`, { config: nextConfig });
    } catch (error) {
      console.error('[TemperatureCard] Failed to persist config', error);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiClient.get<{ config: TemperatureConfig }>(`/api/widgets/${widgetId}`);
        const cfg = response.config || {};
        setEnabled(cfg.enabled ?? DEFAULT_CONFIG.enabled!);
        setLowTemp(cfg.lowTemp ?? DEFAULT_CONFIG.lowTemp!);
        setHighTemp(cfg.highTemp ?? DEFAULT_CONFIG.highTemp!);
        setLowColor(cfg.lowColor ?? DEFAULT_CONFIG.lowColor!);
        setHighColor(cfg.highColor ?? DEFAULT_CONFIG.highColor!);
        setTargetKeys(cfg.targetKeys ?? DEFAULT_CONFIG.targetKeys!);
      } catch (error) {
        console.error('[TemperatureCard] Failed to load config', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleKeysChange = (selection: number | number[] | undefined) => {
    const keys = Array.isArray(selection)
      ? selection.filter((id): id is number => typeof id === 'number')
      : typeof selection === 'number'
      ? [selection]
      : [];
    setTargetKeys(keys);
    persist({ targetKeys: keys });
  };

  const sanitizeNumber = (value: string, fallback: number) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return fallback;
    }
    return parsed;
  };

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    persist({ enabled: checked });
  };

  return (
    <LayerCard
      title="Temperature Gauge"
      description="Map ambient or forecast temperatures to dedicated keys."
      toggleState={enabled}
      onToggle={handleToggle}
      disabled={disabled}
    >
      <div className="temperature-card__row">
        <IonItem lines="none" className="temperature-card__input">
          <IonLabel position="stacked">Low Temp (°F)</IonLabel>
          <IonInput
            type="number"
            value={lowTemp}
            onIonChange={(event) => {
              const value = sanitizeNumber(event.detail.value ?? '', lowTemp);
              setLowTemp(value);
              persist({ lowTemp: value });
            }}
            disabled={controlsDisabled}
          />
        </IonItem>
        <IonItem lines="none" className="temperature-card__input">
          <IonLabel position="stacked">High Temp (°F)</IonLabel>
          <IonInput
            type="number"
            value={highTemp}
            onIonChange={(event) => {
              const value = sanitizeNumber(event.detail.value ?? '', highTemp);
              setHighTemp(value);
              persist({ highTemp: value });
            }}
            disabled={controlsDisabled}
          />
        </IonItem>
      </div>
      <div className="temperature-card__row">
        <IonItem lines="none" className="temperature-card__input">
          <IonLabel position="stacked">Low Temp Color</IonLabel>
          <ColorPicker
            value={lowColor}
            onChange={(value) => {
              setLowColor(value);
              persist({ lowColor: value });
            }}
            disabled={controlsDisabled}
          />
        </IonItem>
        <IonItem lines="none" className="temperature-card__input">
          <IonLabel position="stacked">High Temp Color</IonLabel>
          <ColorPicker
            value={highColor}
            onChange={(value) => {
              setHighColor(value);
              persist({ highColor: value });
            }}
            disabled={controlsDisabled}
          />
        </IonItem>
      </div>
      <IonNote color="medium">
        Temperatures will interpolate between the low/high color range and paint the selected keys.
      </IonNote>
      <KeyPicker
        label="Target Keys"
        helperText="Select keys that should display the gradient."
        multiple
        value={targetKeys}
        onChange={handleKeysChange}
        disabled={controlsDisabled}
      />
    </LayerCard>
  );
};

export default TemperatureCard;
