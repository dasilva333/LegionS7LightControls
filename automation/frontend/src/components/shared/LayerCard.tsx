import React from 'react';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonToggle
} from '@ionic/react';
import './LayerCard.css';

export type LayerCardProps = {
  title: string;
  icon?: string;
  description?: string;
  toggleState?: boolean;
  onToggle?: (checked: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
};

const LayerCard: React.FC<LayerCardProps> = ({
  title,
  icon,
  description,
  toggleState,
  onToggle,
  disabled,
  children
}) => {
  const showToggle = typeof toggleState === 'boolean' && !!onToggle;
  const cardClassNames = [
    'layer-card',
    disabled ? 'layer-card--disabled' : ''
  ]
    .filter(Boolean)
    .join(' ');

  const contentClassNames = [
    'layer-card__content',
    showToggle && toggleState === false ? 'layer-card__content--inactive' : '',
    disabled ? 'layer-card__content--disabled' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <IonCard className={cardClassNames}>
      <IonCardHeader className="layer-card__header">
        <div>
          <IonCardTitle>{icon ? `${icon} ${title}` : title}</IonCardTitle>
          {description && <IonCardSubtitle>{description}</IonCardSubtitle>}
        </div>
        {showToggle && (
          <IonToggle
            checked={toggleState}
            onIonChange={(event) => onToggle?.(event.detail.checked)}
            disabled={disabled}
          />
        )}
      </IonCardHeader>
      {children && (
        <IonCardContent className={contentClassNames}>{children}</IonCardContent>
      )}
    </IonCard>
  );
};

export default LayerCard;
