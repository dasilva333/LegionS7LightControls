import React, { useEffect, useState } from 'react';
import { IonItem, IonLabel, IonSelect, IonSelectOption } from '@ionic/react';
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
};

const DEFAULT_CONFIG: TypingConfig = {
  enabled: true,
  effectStyle: 'Bounce',
  effectColor: '#FFAF00'
};

const TypingFxCard: React.FC<TypingFxCardProps> = ({ disabled }) => {
  const [enabled, setEnabled] = useState(DEFAULT_CONFIG.enabled!);
  const [effectStyle, setEffectStyle] = useState<TypingConfig['effectStyle']>(
    DEFAULT_CONFIG.effectStyle
  );
  const [effectColor, setEffectColor] = useState(DEFAULT_CONFIG.effectColor!);
  const [loading, setLoading] = useState(true);
  const widgetId = 'fx_typing';

  const controlsDisabled = disabled || !enabled || loading;
  const showColorPicker = effectStyle !== 'Rainbow Sparkle';

  const persist = async (overrides: TypingConfig) => {
    const nextConfig = {
      enabled,
      effectStyle,
      effectColor,
      ...overrides
    };
    setEnabled(Boolean(nextConfig.enabled));
    if (nextConfig.effectStyle) setEffectStyle(nextConfig.effectStyle);
    if (nextConfig.effectColor) setEffectColor(nextConfig.effectColor);
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
