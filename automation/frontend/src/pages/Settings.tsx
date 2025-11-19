import React, { useState } from 'react';
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
import './Settings.css';

const Settings: React.FC = () => {
  const [isGodModeEnabled, setIsGodModeEnabled] = useState(true);
  const [zipCode, setZipCode] = useState('94103');

  const handleZipChange = (event: InputCustomEvent<InputChangeEventDetail>) => {
    const value = event.detail.value ?? '';
    setZipCode(value);
  };

  const globalDisabled = !isGodModeEnabled;

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
              onIonChange={(event) => setIsGodModeEnabled(event.detail.checked)}
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
        <SafetyMonitorCard disabled={globalDisabled} />
        <TypingFxCard disabled={globalDisabled} />
        <AudioFxCard disabled={globalDisabled} />
      </IonContent>
    </IonPage>
  );
};

export default Settings;
