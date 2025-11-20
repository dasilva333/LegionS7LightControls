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
  IonItem,
  IonSearchbar
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
  const [searchText, setSearchText] = useState('');
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
      setSearchText(''); // Reset search when closing/opening
    }
  }, [normalizedValue, isOpen]);

  // Filter and Group Logic
  const { selectedKeys, availableGroups } = useMemo(() => {
    const lowerSearch = searchText.toLowerCase();
    const selected: any[] = [];
    const available: any[] = [];
    const selectedIds = new Set(pendingSelection);

    keyGroups.forEach(group => {
      const groupMatches = group.group_name.toLowerCase().includes(lowerSearch);
      const availableKeysInGroup: any[] = [];

      group.keys.forEach(key => {
        const keyMatches = key.key_name.toLowerCase().includes(lowerSearch);
        const isMatch = !searchText || groupMatches || keyMatches;
        const isSelected = selectedIds.has(key.id);

        if (isSelected) {
          if (isMatch) {
            selected.push({ ...key, group_name: group.group_name });
          }
        } else if (isMatch) {
          availableKeysInGroup.push(key);
        }
      });

      if (availableKeysInGroup.length > 0) {
        available.push({ ...group, keys: availableKeysInGroup });
      }
    });

    return { selectedKeys: selected, availableGroups: available };
  }, [pendingSelection, searchText]);

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
          <IonToolbar>
            <IonSearchbar
              value={searchText}
              onIonInput={e => setSearchText(e.detail.value!)}
              placeholder="Search keys or groups..."
              debounce={300}
            />
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <IonList>
            {/* Selected Keys Section */}
            {selectedKeys.length > 0 && (
              <>
                <IonListHeader>
                  <IonLabel color="primary">Selected ({selectedKeys.length})</IonLabel>
                </IonListHeader>
                {selectedKeys.map((key) => (
                  <IonItem key={key.id}>
                    <IonLabel>
                      {key.key_name}
                      <IonNote slot="end" style={{ fontSize: '0.8em', marginRight: '8px' }}>
                        {key.group_name}
                      </IonNote>
                    </IonLabel>
                    <IonCheckbox
                      slot="end"
                      checked={true}
                      onIonChange={() => handleToggle(key.id)}
                    />
                  </IonItem>
                ))}
              </>
            )}

            {/* Available Groups Section */}
            {availableGroups.map((group) => (
              <React.Fragment key={group.group_name}>
                <IonListHeader>
                  <IonLabel>{group.group_name}</IonLabel>
                </IonListHeader>
                {group.keys.map((key: any) => (
                  <IonItem key={key.id}>
                    <IonLabel>{key.key_name}</IonLabel>
                    <IonCheckbox
                      slot="end"
                      checked={false}
                      onIonChange={() => handleToggle(key.id)}
                    />
                  </IonItem>
                ))}
              </React.Fragment>
            ))}

            {selectedKeys.length === 0 && availableGroups.length === 0 && (
              <div className="ion-padding ion-text-center">
                <IonNote>No keys found matching &quot;{searchText}&quot;</IonNote>
              </div>
            )}
          </IonList>
        </IonContent>
      </IonModal>
    </div>
  );
};

export default KeyPicker;
