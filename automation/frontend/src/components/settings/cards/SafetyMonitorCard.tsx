import React, { useEffect, useState } from 'react';
import {
  IonButton,
  IonItem,
  IonLabel,
  IonNote,
  IonSelect,
  IonSelectOption
} from '@ionic/react';
import LayerCard from '../../shared/LayerCard';
import ColorPicker from '../../shared/ColorPicker';
import KeyPicker from '../../shared/KeyPicker';
import { apiClient } from '../../../config/api';
import './SafetyMonitorCard.css';

type SafetyMonitorCardProps = {
  disabled?: boolean;
};

type SafetyConfig = {
  authenticated?: boolean;
  selectedItem?: string;
  thresholdMinutes?: number;
  alertKey?: number;
  alertColor?: string;
};

const mockItems = [
  { id: 'styx', label: 'Styx (Laptop)' },
  { id: 'shamree', label: 'Shamree (Bag)' }
];

const DEFAULT_CONFIG: SafetyConfig = {
  authenticated: false,
  selectedItem: mockItems[0].id,
  thresholdMinutes: 15,
  alertColor: '#FF1E56'
};

const SafetyMonitorCard: React.FC<SafetyMonitorCardProps> = ({ disabled }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(DEFAULT_CONFIG.authenticated!);
  const [selectedItem, setSelectedItem] = useState(DEFAULT_CONFIG.selectedItem!);
  const [thresholdMinutes, setThresholdMinutes] = useState(DEFAULT_CONFIG.thresholdMinutes!);
  const [alertKey, setAlertKey] = useState<number | undefined>();
  const [alertColor, setAlertColor] = useState(DEFAULT_CONFIG.alertColor!);
  const [loading, setLoading] = useState(true);
  const widgetId = 'safety';

  const persist = async (nextConfig: SafetyConfig) => {
    const merged = {
      authenticated: isAuthenticated,
      selectedItem,
      thresholdMinutes,
      alertKey,
      alertColor,
      ...nextConfig
    };
    setIsAuthenticated(Boolean(merged.authenticated));
    if (merged.selectedItem) setSelectedItem(merged.selectedItem);
    if (typeof merged.thresholdMinutes === 'number')
      setThresholdMinutes(merged.thresholdMinutes);
    if (typeof merged.alertKey === 'number') setAlertKey(merged.alertKey);
    if (merged.alertColor) setAlertColor(merged.alertColor);
    try {
      await apiClient.post(`/api/widgets/${widgetId}`, { config: merged });
    } catch (error) {
      console.error('[SafetyMonitorCard] Failed to persist config', error);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiClient.get<{ config: SafetyConfig }>(`/api/widgets/${widgetId}`);
        const cfg = response.config || {};
        setIsAuthenticated(cfg.authenticated ?? DEFAULT_CONFIG.authenticated!);
        setSelectedItem(cfg.selectedItem ?? DEFAULT_CONFIG.selectedItem!);
        setThresholdMinutes(cfg.thresholdMinutes ?? DEFAULT_CONFIG.thresholdMinutes!);
        setAlertKey(cfg.alertKey);
        setAlertColor(cfg.alertColor ?? DEFAULT_CONFIG.alertColor!);
      } catch (error) {
        console.error('[SafetyMonitorCard] Failed to load config', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const controlsDisabled = disabled || !isAuthenticated || loading;

  const handleLogin = () => {
    setIsAuthenticated(true);
    persist({ authenticated: true });
  };

  return (
    <LayerCard
      title="Safety Monitor"
      description="Monitor FindMy devices and run alert animations."
      disabled={disabled}
    >
      {!isAuthenticated ? (
        <div className="safety-card__unauth">
          <IonNote color="medium">
            Connect to Apple FindMy to monitor important devices and trigger lighting alerts.
          </IonNote>
          <IonButton expand="block" onClick={handleLogin} disabled={disabled}>
            Log in with Apple
          </IonButton>
        </div>
      ) : (
        <div className="safety-card__content">
          <IonItem lines="none">
            <IonLabel position="stacked">Tracked Item</IonLabel>
            <IonSelect
              interface="popover"
              value={selectedItem}
              onIonChange={(event) => {
                const value = event.detail.value;
                setSelectedItem(value);
                persist({ selectedItem: value });
              }}
              disabled={controlsDisabled}
            >
              {mockItems.map((item) => (
                <IonSelectOption key={item.id} value={item.id}>
                  {item.label}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
          <IonItem lines="none">
            <IonLabel position="stacked">Threshold (minutes since last seen)</IonLabel>
            <IonSelect
              interface="popover"
              value={thresholdMinutes}
              onIonChange={(event) => {
                const value = Number(event.detail.value);
                setThresholdMinutes(value);
                persist({ thresholdMinutes: value });
              }}
              disabled={controlsDisabled}
            >
              {[5, 10, 15, 30, 60].map((value) => (
                <IonSelectOption key={value} value={value}>
                  {value} min
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
          <KeyPicker
            label="Alert Target Key"
            multiple={false}
            value={alertKey}
            onChange={(value) => {
              const nextKey = Array.isArray(value) ? value[0] : value;
              setAlertKey(typeof nextKey === 'number' ? nextKey : undefined);
              persist({ alertKey: typeof nextKey === 'number' ? nextKey : undefined });
            }}
            disabled={controlsDisabled}
          />
          <IonItem lines="none">
            <IonLabel position="stacked">Alert Color</IonLabel>
            <ColorPicker
              value={alertColor}
              onChange={(value) => {
                setAlertColor(value);
                persist({ alertColor: value });
              }}
              disabled={controlsDisabled}
            />
          </IonItem>
        </div>
      )}
    </LayerCard>
  );
};

export default SafetyMonitorCard;
