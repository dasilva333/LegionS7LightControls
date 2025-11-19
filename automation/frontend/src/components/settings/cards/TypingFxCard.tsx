import React, { useState } from 'react';
import { IonItem, IonLabel, IonSelect, IonSelectOption } from '@ionic/react';
import LayerCard from '../../shared/LayerCard';
import ColorPicker from '../../shared/ColorPicker';
import './TypingFxCard.css';

type TypingFxCardProps = {
  disabled?: boolean;
};

const TypingFxCard: React.FC<TypingFxCardProps> = ({ disabled }) => {
  const [enabled, setEnabled] = useState(true);
  const [effectStyle, setEffectStyle] = useState<'Bounce' | 'Flash' | 'Rainbow Sparkle'>('Bounce');
  const [effectColor, setEffectColor] = useState('#FFAF00');

  const controlsDisabled = disabled || !enabled;
  const showColorPicker = effectStyle !== 'Rainbow Sparkle';

  return (
    <LayerCard
      title="Typing Reactive FX"
      description="Choose how keys respond to each keystroke."
      toggleState={enabled}
      onToggle={setEnabled}
      disabled={disabled}
    >
      <IonItem lines="none" className="typing-card__item">
        <IonLabel position="stacked">Effect Style</IonLabel>
        <IonSelect
          interface="popover"
          value={effectStyle}
          onIonChange={(event) => setEffectStyle(event.detail.value)}
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
          <ColorPicker value={effectColor} onChange={setEffectColor} disabled={controlsDisabled} />
        </IonItem>
      )}
    </LayerCard>
  );
};

export default TypingFxCard;
