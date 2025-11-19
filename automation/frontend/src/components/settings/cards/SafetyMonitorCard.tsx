import React, { useState } from 'react';
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
import './SafetyMonitorCard.css';

type SafetyMonitorCardProps = {
  disabled?: boolean;
};

const mockItems = [
  { id: 'styx', label: 'Styx (Laptop)' },
  { id: 'shamree', label: 'Shamree (Bag)' }
];

const SafetyMonitorCard: React.FC<SafetyMonitorCardProps> = ({ disabled }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedItem, setSelectedItem] = useState(mockItems[0].id);
  const [thresholdMinutes, setThresholdMinutes] = useState(15);
  const [alertKey, setAlertKey] = useState<number | undefined>();
  const [alertColor, setAlertColor] = useState('#FF1E56');

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleKeyChange = (selection: number | number[] | undefined) => {
    if (Array.isArray(selection)) {
      setAlertKey(selection[0]);
    } else if (typeof selection === 'number') {
      setAlertKey(selection);
    } else {
      setAlertKey(undefined);
    }
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
              onIonChange={(event) => setSelectedItem(event.detail.value)}
              disabled={disabled}
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
              onIonChange={(event) => setThresholdMinutes(Number(event.detail.value))}
              disabled={disabled}
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
            onChange={handleKeyChange}
            disabled={disabled}
          />
          <IonItem lines="none">
            <IonLabel position="stacked">Alert Color</IonLabel>
            <ColorPicker value={alertColor} onChange={setAlertColor} disabled={disabled} />
          </IonItem>
        </div>
      )}
    </LayerCard>
  );
};

export default SafetyMonitorCard;
