import React, { useEffect, useState } from 'react';
import { IonItem, IonLabel, IonSelect, IonSelectOption, IonRange } from '@ionic/react';
import LayerCard from '../../shared/LayerCard';
import ColorPicker from '../../shared/ColorPicker';
import { apiClient } from '../../../config/api';
import './TypingFxCard.css';

type TypingFxCardProps = {
  disabled?: boolean;
};

type TypingConfig = {
  enabled?: boolean;
  effectStyle?: 'Bounce' | 'Flash' | 'Rainbow Sparkle';
  effectColor?: string;
  refreshRate?: number;
  intensity?: number;
};

const DEFAULT_CONFIG: TypingConfig = {
  enabled: true,
  effectStyle: 'Bounce',
  effectColor: '#FFAF00',
  refreshRate: 2000,
  intensity: 0.1
};

const TypingFxCard: React.FC<TypingFxCardProps> = ({ disabled }) => {
  const [enabled, setEnabled] = useState(DEFAULT_CONFIG.enabled!);
  const [effectStyle, setEffectStyle] = useState<TypingConfig['effectStyle']>(
    DEFAULT_CONFIG.effectStyle
  );
  const [effectColor, setEffectColor] = useState(DEFAULT_CONFIG.effectColor!);
  const [refreshRate, setRefreshRate] = useState<number>(DEFAULT_CONFIG.refreshRate!);
  const [intensity, setIntensity] = useState<number>(DEFAULT_CONFIG.intensity!);
  const [loading, setLoading] = useState(true);
  const widgetId = 'fx_typing';

  const controlsDisabled = disabled || !enabled || loading;
  const showColorPicker = effectStyle !== 'Rainbow Sparkle';

  const persist = async (overrides: TypingConfig) => {
    const nextConfig = {
      enabled,
      effectStyle,
      effectColor,
      refreshRate,
      intensity,
      ...overrides
    };
    setEnabled(Boolean(nextConfig.enabled));
    if (nextConfig.effectStyle) setEffectStyle(nextConfig.effectStyle);
    if (nextConfig.effectColor) setEffectColor(nextConfig.effectColor);
    if (nextConfig.refreshRate) setRefreshRate(nextConfig.refreshRate);
    if (nextConfig.intensity) setIntensity(nextConfig.intensity);
    try {
      await apiClient.post(`/api/widgets/${widgetId}`, { config: nextConfig });
    } catch (error) {
      console.error('[TypingFxCard] Failed to persist config', error);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiClient.get<{ config: TypingConfig }>(`/api/widgets/${widgetId}`);
        const cfg = response.config || {};
        setEnabled(cfg.enabled ?? DEFAULT_CONFIG.enabled!);
        setEffectStyle(cfg.effectStyle ?? DEFAULT_CONFIG.effectStyle!);
        setEffectColor(cfg.effectColor ?? DEFAULT_CONFIG.effectColor!);
        setRefreshRate(cfg.refreshRate ?? DEFAULT_CONFIG.refreshRate!);
        setIntensity(cfg.intensity ?? DEFAULT_CONFIG.intensity!);
      } catch (error) {
        console.error('[TypingFxCard] Failed to load config', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <LayerCard
      title="Typing Reactive FX"
      description="Choose how keys respond to each keystroke."
      toggleState={enabled}
      onToggle={(checked) => persist({ enabled: checked })}
      disabled={disabled}
    >
      <IonItem lines="none" className="typing-card__item">
        <IonLabel position="stacked">Effect Style</IonLabel>
        <IonSelect
          interface="popover"
          value={effectStyle}
          onIonChange={(event) => persist({ effectStyle: event.detail.value })}
          disabled={controlsDisabled}
        >
          <IonSelectOption value="Bounce">Bounce</IonSelectOption>
          <IonSelectOption value="Flash">Flash</IonSelectOption>
          <IonSelectOption value="Rainbow Sparkle">Rainbow Sparkle</IonSelectOption>
        </IonSelect>
      </IonItem>
      <IonItem lines="none" className="typing-card__item">
        <IonLabel position="stacked">Refresh Rate ({refreshRate}ms)</IonLabel>
        <IonRange
          min={500}
          max={5000}
          step={100}
          value={refreshRate}
          onIonChange={(e) => persist({ refreshRate: e.detail.value as number })}
          disabled={controlsDisabled}
        />
      </IonItem>
      <IonItem lines="none" className="typing-card__item">
        <IonLabel position="stacked">Intensity ({intensity})</IonLabel>
        <IonRange
          min={0.0}
          max={0.5}
          step={0.05}
          value={intensity}
          onIonChange={(e) => persist({ intensity: e.detail.value as number })}
          disabled={controlsDisabled}
        />
      </IonItem>
      {showColorPicker && (
        <IonItem lines="none" className="typing-card__item">
          <IonLabel position="stacked">Effect Color</IonLabel>
          <ColorPicker
            value={effectColor}
            onChange={(value) => persist({ effectColor: value })}
            disabled={controlsDisabled}
          />
        </IonItem>
      )}
    </LayerCard>
  );
};

export default TypingFxCard;
