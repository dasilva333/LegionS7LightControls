import React, { useState } from 'react';
import { IonCheckbox, IonItem, IonLabel, IonNote } from '@ionic/react';
import LayerCard from '../../shared/LayerCard';
import KeyPicker from '../../shared/KeyPicker';
import ColorPicker from '../../shared/ColorPicker';
import './ProgressBarCard.css';

type ProgressBarCardProps = {
  disabled?: boolean;
};

const ProgressBarCard: React.FC<ProgressBarCardProps> = ({ disabled }) => {
  const [enabled, setEnabled] = useState(true);
  const [startKey, setStartKey] = useState<number | undefined>();
  const [endKey, setEndKey] = useState<number | undefined>();
  const [startColor, setStartColor] = useState('#00FF9D');
  const [endColor, setEndColor] = useState('#FF3B6D');
  const [restEndpointEnabled, setRestEndpointEnabled] = useState(true);
  const [socketEnabled, setSocketEnabled] = useState(true);

  const controlsDisabled = disabled || !enabled;

  const handleKeyChange = (value: number | number[] | undefined, setter: (key?: number) => void) => {
    if (Array.isArray(value)) {
      setter(value[0]);
    } else if (typeof value === 'number') {
      setter(value);
    } else {
      setter(undefined);
    }
  };

  return (
    <LayerCard
      title="Universal Progress Bar"
      description="Light a continuous bar between two keys for interrupts (downloads, installs, etc.)."
      toggleState={enabled}
      onToggle={setEnabled}
      disabled={disabled}
    >
      <div className="progress-card__row">
        <KeyPicker
          label="Start Key"
          multiple={false}
          value={startKey}
          onChange={(value) => handleKeyChange(value, setStartKey)}
          disabled={controlsDisabled}
        />
        <KeyPicker
          label="End Key"
          multiple={false}
          value={endKey}
          onChange={(value) => handleKeyChange(value, setEndKey)}
          disabled={controlsDisabled}
        />
      </div>
      <div className="progress-card__row">
        <ColorPicker value={startColor} onChange={setStartColor} disabled={controlsDisabled} />
        <ColorPicker value={endColor} onChange={setEndColor} disabled={controlsDisabled} />
      </div>
      <IonNote color="medium">
        Colors interpolate from the start key to end key to show current progress.
      </IonNote>
      <IonItem lines="none">
        <IonLabel>REST Endpoint</IonLabel>
        <IonCheckbox
          slot="end"
          checked={restEndpointEnabled}
          onIonChange={(event) => setRestEndpointEnabled(event.detail.checked)}
          disabled={controlsDisabled}
        />
      </IonItem>
      <IonItem lines="none">
        <IonLabel>Socket.io Broadcast</IonLabel>
        <IonCheckbox
          slot="end"
          checked={socketEnabled}
          onIonChange={(event) => setSocketEnabled(event.detail.checked)}
          disabled={controlsDisabled}
        />
      </IonItem>
    </LayerCard>
  );
};

export default ProgressBarCard;
