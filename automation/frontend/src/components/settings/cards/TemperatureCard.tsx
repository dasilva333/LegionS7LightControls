import React, { useState } from 'react';
import { IonItem, IonInput, IonLabel, IonNote } from '@ionic/react';
import LayerCard from '../../shared/LayerCard';
import ColorPicker from '../../shared/ColorPicker';
import KeyPicker from '../../shared/KeyPicker';
import './TemperatureCard.css';

type TemperatureCardProps = {
  disabled?: boolean;
};

const TemperatureCard: React.FC<TemperatureCardProps> = ({ disabled }) => {
  const [enabled, setEnabled] = useState(true);
  const [lowTemp, setLowTemp] = useState(30);
  const [highTemp, setHighTemp] = useState(100);
  const [lowColor, setLowColor] = useState('#00A3FF');
  const [highColor, setHighColor] = useState('#FF4D4D');
  const [targetKeys, setTargetKeys] = useState<number[]>([]);

  const controlsDisabled = disabled || !enabled;

  const handleKeysChange = (selection: number | number[] | undefined) => {
    if (Array.isArray(selection)) {
      setTargetKeys(selection.filter((id): id is number => typeof id === 'number'));
    } else if (typeof selection === 'number') {
      setTargetKeys([selection]);
    } else {
      setTargetKeys([]);
    }
  };

  const sanitizeNumber = (value: string, fallback: number) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return fallback;
    }
    return parsed;
  };

  return (
    <LayerCard
      title="Temperature Gauge"
      description="Map ambient or forecast temperatures to dedicated keys."
      toggleState={enabled}
      onToggle={setEnabled}
      disabled={disabled}
    >
      <div className="temperature-card__row">
        <IonItem lines="none" className="temperature-card__input">
          <IonLabel position="stacked">Low Temp (°F)</IonLabel>
          <IonInput
            type="number"
            value={lowTemp}
            onIonChange={(event) => setLowTemp(sanitizeNumber(event.detail.value ?? '', lowTemp))}
            disabled={controlsDisabled}
          />
        </IonItem>
        <IonItem lines="none" className="temperature-card__input">
          <IonLabel position="stacked">High Temp (°F)</IonLabel>
          <IonInput
            type="number"
            value={highTemp}
            onIonChange={(event) => setHighTemp(sanitizeNumber(event.detail.value ?? '', highTemp))}
            disabled={controlsDisabled}
          />
        </IonItem>
      </div>
      <div className="temperature-card__row">
        <IonItem lines="none" className="temperature-card__input">
          <IonLabel position="stacked">Low Temp Color</IonLabel>
          <ColorPicker value={lowColor} onChange={setLowColor} disabled={controlsDisabled} />
        </IonItem>
        <IonItem lines="none" className="temperature-card__input">
          <IonLabel position="stacked">High Temp Color</IonLabel>
          <ColorPicker value={highColor} onChange={setHighColor} disabled={controlsDisabled} />
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
