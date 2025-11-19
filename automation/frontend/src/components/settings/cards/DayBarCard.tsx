import React, { useState } from 'react';
import { IonItem, IonLabel, IonNote, IonText } from '@ionic/react';
import LayerCard from '../../shared/LayerCard';
import ColorPicker from '../../shared/ColorPicker';
import './DayBarCard.css';

type DayBarCardProps = {
  disabled?: boolean;
};

const DayBarCard: React.FC<DayBarCardProps> = ({ disabled }) => {
  const [enabled, setEnabled] = useState(true);
  const [activeColor, setActiveColor] = useState('#FF8800');
  const [inactiveColor, setInactiveColor] = useState('#1B1F3B');

  const controlsDisabled = disabled || !enabled;

  return (
    <LayerCard
      title="Day Bar"
      description="Create a 24-hour indicator across the function row."
      toggleState={enabled}
      onToggle={setEnabled}
      disabled={disabled}
    >
      <IonItem lines="none" className="daybar-card__item">
        <IonLabel position="stacked">Active Color (Past Hours)</IonLabel>
        <ColorPicker value={activeColor} onChange={setActiveColor} disabled={controlsDisabled} />
      </IonItem>
      <IonItem lines="none" className="daybar-card__item">
        <IonLabel position="stacked">Inactive Color (Upcoming Hours)</IonLabel>
        <ColorPicker value={inactiveColor} onChange={setInactiveColor} disabled={controlsDisabled} />
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
