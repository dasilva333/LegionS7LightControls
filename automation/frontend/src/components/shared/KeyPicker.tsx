import React, { useEffect, useMemo, useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonLabel,
  IonList,
  IonListHeader,
  IonModal,
  IonNote,
  IonTitle,
  IonToolbar,
  IonItem
} from '@ionic/react';
import keyGroups from '../../fixtures/keyGroups.json';
import './KeyPicker.css';

export type KeyPickerProps = {
  label?: string;
  value?: number | number[];
  onChange: (value: number | number[] | undefined) => void;
  multiple?: boolean;
  disabled?: boolean;
  helperText?: string;
};

const normalizeValue = (value: number | number[] | undefined, multiple: boolean): number[] => {
  if (multiple) {
    if (Array.isArray(value)) {
      return value;
    }
    return value !== undefined ? [value] : [];
  }

  if (Array.isArray(value)) {
    return value.length ? [value[0]] : [];
  }
  return value !== undefined ? [value] : [];
};

const KeyPicker: React.FC<KeyPickerProps> = ({
  label = 'Key Picker',
  value,
  onChange,
  multiple = true,
  disabled,
  helperText
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<number[]>(() => normalizeValue(value, multiple));

  const normalizedValue = useMemo(() => normalizeValue(value, multiple), [value, multiple]);

  const keyNameLookup = useMemo(() => {
    const map = new Map<number, string>();
    keyGroups.forEach((group) =>
      group.keys.forEach((key) => map.set(key.id, key.key_name))
    );
    return map;
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setPendingSelection(normalizedValue);
    }
  }, [normalizedValue, isOpen]);

  const selectedCount = normalizedValue.length;
  let buttonLabel = 'Select Keys';
  if (selectedCount === 1) {
    const keyName = keyNameLookup.get(normalizedValue[0]);
    buttonLabel = keyName ? `Selected: ${keyName}` : 'Selected: 1 key';
  } else if (selectedCount > 1) {
    buttonLabel = `Select keys (${selectedCount} selected)`;
  }

  const handleToggle = (keyId: number) => {
    setPendingSelection((prev) => {
      if (multiple) {
        return prev.includes(keyId) ? prev.filter((id) => id !== keyId) : [...prev, keyId];
      }
      return prev.includes(keyId) ? [] : [keyId];
    });
  };

  const handleDone = () => {
    setIsOpen(false);
    if (multiple) {
      onChange(pendingSelection);
    } else {
      onChange(pendingSelection[0]);
    }
  };

  return (
    <div className="key-picker">
      {label && (
        <div className="key-picker__header">
          <IonLabel>{label}</IonLabel>
          {helperText && (
            <IonNote color="medium" className="key-picker__helper">
              {helperText}
            </IonNote>
          )}
        </div>
      )}
      <IonButton
        expand="block"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        fill="outline"
      >
        {buttonLabel}
      </IonButton>

      <IonModal isOpen={isOpen} onDidDismiss={() => setIsOpen(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Select Keys</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={handleDone}>Done</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <IonList>
            {keyGroups.map((group) => (
              <React.Fragment key={group.group_name}>
                <IonListHeader>
                  <IonLabel>{group.group_name}</IonLabel>
                </IonListHeader>
                {group.keys.map((key) => (
                  <IonItem key={key.id}>
                    <IonLabel>{key.key_name}</IonLabel>
                    <IonCheckbox
                      slot="end"
                      checked={pendingSelection.includes(key.id)}
                      onIonChange={() => handleToggle(key.id)}
                    />
                  </IonItem>
                ))}
              </React.Fragment>
            ))}
          </IonList>
        </IonContent>
      </IonModal>
    </div>
  );
};

export default KeyPicker;
