import React, { useEffect, useState } from 'react';
import { IonItem, IonLabel, IonNote, IonText } from '@ionic/react';
import LayerCard from '../../shared/LayerCard';
import ColorPicker from '../../shared/ColorPicker';
import { apiClient } from '../../../config/api';
import './DayBarCard.css';

type DayBarCardProps = {
  disabled?: boolean;
};

type DayBarConfig = {
  enabled?: boolean;
  activeColor?: string;
  inactiveColor?: string;
};

const DEFAULT_CONFIG: DayBarConfig = {
  enabled: true,
  activeColor: '#FF8800',
  inactiveColor: '#1B1F3B'
};

const DayBarCard: React.FC<DayBarCardProps> = ({ disabled }) => {
  const [enabled, setEnabled] = useState(DEFAULT_CONFIG.enabled ?? true);
  const [activeColor, setActiveColor] = useState(DEFAULT_CONFIG.activeColor!);
  const [inactiveColor, setInactiveColor] = useState(DEFAULT_CONFIG.inactiveColor!);
  const [loading, setLoading] = useState(true);

  const widgetId = 'day_bar';

  const persist = async (overrides: DayBarConfig) => {
    const nextConfig = {
      enabled,
      activeColor,
      inactiveColor,
      ...overrides
    };
    setEnabled(nextConfig.enabled ?? enabled);
    if (nextConfig.activeColor) setActiveColor(nextConfig.activeColor);
    if (nextConfig.inactiveColor) setInactiveColor(nextConfig.inactiveColor);
    try {
      await apiClient.post(`/api/widgets/${widgetId}`, { config: nextConfig });
    } catch (error) {
      console.error('[DayBarCard] Failed to persist config', error);
    }
  };

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    persist({ enabled: checked });
  };

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiClient.get<{ config: DayBarConfig }>(`/api/widgets/${widgetId}`);
        const data = response.config || {};
        setEnabled(data.enabled ?? DEFAULT_CONFIG.enabled!);
        setActiveColor(data.activeColor ?? DEFAULT_CONFIG.activeColor!);
        setInactiveColor(data.inactiveColor ?? DEFAULT_CONFIG.inactiveColor!);
      } catch (error) {
        console.error('[DayBarCard] Failed to load config', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const controlsDisabled = disabled || !enabled || loading;

  return (
    <LayerCard
      title="Day Bar"
      description="Create a 24-hour indicator across the function row."
      toggleState={enabled}
      onToggle={handleToggle}
      disabled={disabled}
    >
      <IonItem lines="none" className="daybar-card__item">
        <IonLabel position="stacked">Active Color (Past Hours)</IonLabel>
        <ColorPicker
          value={activeColor}
          onChange={(value) => {
            setActiveColor(value);
            persist({ activeColor: value });
          }}
          disabled={controlsDisabled}
        />
      </IonItem>
      <IonItem lines="none" className="daybar-card__item">
        <IonLabel position="stacked">Inactive Color (Upcoming Hours)</IonLabel>
        <ColorPicker
          value={inactiveColor}
          onChange={(value) => {
            setInactiveColor(value);
            persist({ inactiveColor: value });
          }}
          disabled={controlsDisabled}
        />
      </IonItem>
      <IonNote color="medium">
        F1-F12 represent 24 hours. Past hours adopt the active color while future hours use the inactive color.
      </IonNote>
      <div className="daybar-card__preview">
        <IonText color="medium">Preview</IonText>
        <div
          className="daybar-card__preview-bar"
          style={{
            background: `linear-gradient(90deg, ${activeColor} 0%, ${activeColor} 50%, ${inactiveColor} 50%, ${inactiveColor} 100%)`
          }}
        />
      </div>
    </LayerCard>
  );
};

export default DayBarCard;
