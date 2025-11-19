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
  InputChangeEventDetail
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
  audioFx: false
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
            <span className="godmode-label">God Mode</span>
            <IonToggle
              checked={isGodModeEnabled}
              onIonChange={(event) => handleMasterToggle(event.detail.checked)}
              disabled={loadingState}
            />
          </div>
        </IonToolbar>
        <IonToolbar className="settings-subtoolbar">
          <IonItem lines="none" className="zip-input">
            <IonLabel position="stacked">Zip Code</IonLabel>
            <IonInput
              type="text"
              value={zipCode}
              maxlength={10}
              onIonChange={handleZipChange}
              placeholder="Enter Zip"
            />
          </IonItem>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <BackgroundCard disabled={globalDisabled} />
        <WeatherCard disabled={globalDisabled} />
        <ProcessMonitorCard disabled={globalDisabled} />
        <ShortcutsCard disabled={globalDisabled} />
        <DayBarCard disabled={globalDisabled} />
        <TemperatureCard disabled={globalDisabled} />
        <ProgressBarCard disabled={globalDisabled} />
        <SafetyMonitorCard disabled={globalDisabled || !settingsSupports.safetyMonitor} />
        <TypingFxCard disabled={globalDisabled} />
        <AudioFxCard disabled={globalDisabled || !settingsSupports.audioFx} />
      </IonContent>
    </IonPage>
  );
};

export default Settings;
