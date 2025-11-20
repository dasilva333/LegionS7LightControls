import React, { useEffect, useRef, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonTitle,
  IonToggle,
  IonToolbar,
  InputChangeEventDetail,
  IonGrid,
  IonRow,
  IonCol
} from '@ionic/react';
import { InputCustomEvent } from '@ionic/react';
import BackgroundCard from '../components/settings/cards/BackgroundCard';
import WeatherCard from '../components/settings/cards/WeatherCard';
import ProcessMonitorCard from '../components/settings/cards/ProcessMonitorCard';
import ShortcutsCard from '../components/settings/cards/ShortcutsCard';
import DayBarCard from '../components/settings/cards/DayBarCard';
import TemperatureCard from '../components/settings/cards/TemperatureCard';
import ProgressBarCard from '../components/settings/cards/ProgressBarCard';
import SafetyMonitorCard from '../components/settings/cards/SafetyMonitorCard';
import TypingFxCard from '../components/settings/cards/TypingFxCard';
import AudioFxCard from '../components/settings/cards/AudioFxCard';
import { apiClient } from '../config/api';
import './Settings.css';

const settingsSupports = {
  safetyMonitor: false,
  audioFx: true
};

const Settings: React.FC = () => {
  const [isGodModeEnabled, setIsGodModeEnabled] = useState(false);
  const [zipCode, setZipCode] = useState('');
  const [loadingState, setLoadingState] = useState(true);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchState = async () => {
    try {
      const data = await apiClient.get<{
        active?: boolean;
        weatherSettings?: { zipCode?: string };
      }>('/api/godmode/state');
      setIsGodModeEnabled(Boolean(data.active));
      setZipCode(data.weatherSettings?.zipCode ?? '');
    } catch (error) {
      console.error('[Settings] Failed to load God Mode state', error);
    } finally {
      setLoadingState(false);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => {
      clearInterval(interval);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleMasterToggle = async (checked: boolean) => {
    setIsGodModeEnabled(checked);
    try {
      await apiClient.post('/api/godmode', { command: checked ? 'enable' : 'disable' });
    } catch (error) {
      console.error('[Settings] Failed to toggle God Mode', error);
    } finally {
      fetchState();
    }
  };

  const globalDisabled = !isGodModeEnabled;

  const handleZipChange = (event: InputCustomEvent<InputChangeEventDetail>) => {
    const value = event.detail.value ?? '';
    setZipCode(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      apiClient.post('/api/godmode/state', {
        weatherSettings: { zipCode: value }
      }).catch((error) => {
        console.error('[Settings] Failed to update Zip Code', error);
      });
    }, 600);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="settings-toolbar">
          <div className="settings-toolbar__left">
            <IonTitle>Compositor Settings</IonTitle>
            <div className={`status-dot ${isGodModeEnabled ? 'status-dot--connected' : 'status-dot--disconnected'}`} />
          </div>
          <div className="settings-toolbar__right">
            <IonItem lines="none" className="zip-input-item">
              <IonInput
                type="text"
                value={zipCode}
                maxlength={10}
                onIonChange={handleZipChange}
                placeholder="Zip Code"
              />
            </IonItem>
            <div className="godmode-control">
              <span className="godmode-label">God Mode</span>
              <IonToggle
                checked={isGodModeEnabled}
                onIonChange={(event) => handleMasterToggle(event.detail.checked)}
                disabled={loadingState}
              />
            </div>
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <IonGrid>
          {/* Row 1: Background */}
          <IonRow>
            <IonCol size="12">
              <BackgroundCard disabled={globalDisabled} />
            </IonCol>
          </IonRow>

          {/* Row 2: Weather / Process */}
          <IonRow>
            <IonCol size="12" sizeLg="6">
              <WeatherCard disabled={globalDisabled} />
            </IonCol>
            <IonCol size="12" sizeLg="6">
              <ProcessMonitorCard disabled={globalDisabled} />
            </IonCol>
          </IonRow>

          {/* Row 3: Day Bar / Temp */}
          <IonRow>
            <IonCol size="12" sizeLg="6">
              <DayBarCard disabled={globalDisabled} />
            </IonCol>
            <IonCol size="12" sizeLg="6">
              <TemperatureCard disabled={globalDisabled} />
            </IonCol>
          </IonRow>

          {/* Row 4: Typing / Audio */}
          <IonRow>
            <IonCol size="12" sizeLg="6">
              <TypingFxCard disabled={globalDisabled} />
            </IonCol>
            <IonCol size="12" sizeLg="6">
              <AudioFxCard disabled={globalDisabled || !settingsSupports.audioFx} />
            </IonCol>
          </IonRow>

          {/* Row 5: Progress Bar */}
          <IonRow>
            <IonCol size="12">
              <ProgressBarCard disabled={globalDisabled} />
            </IonCol>
          </IonRow>

          {/* Row 6: Shortcuts */}
          <IonRow>
            <IonCol size="12">
              <ShortcutsCard disabled={globalDisabled} />
            </IonCol>
          </IonRow>

          {/* Safety Monitor (Hidden/Commented) */}
          {/* <IonRow>
            <IonCol size="12">
              <SafetyMonitorCard disabled={globalDisabled || !settingsSupports.safetyMonitor} />
            </IonCol>
          </IonRow> */}
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default Settings;
