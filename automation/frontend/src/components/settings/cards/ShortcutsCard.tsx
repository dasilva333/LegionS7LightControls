import React, { useMemo, useState } from 'react';
import {
  IonAccordion,
  IonAccordionGroup,
  IonAlert,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonText,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { addOutline, trashOutline, closeOutline, saveOutline } from 'ionicons/icons';
import LayerCard from '../../shared/LayerCard';
import contextualShortcuts from '../../../fixtures/contextualShortcuts.json';
import keyGroups from '../../../fixtures/keyGroups.json';
import KeyPicker from '../../shared/KeyPicker';
import ColorPicker from '../../shared/ColorPicker';
import './ShortcutsCard.css';

type ShortcutsCardProps = {
  disabled?: boolean;
};

type ShortcutEntry = {
  processName: string;
  enabled: boolean;
  keys: { keyId: number; color: string }[];
};

const buildKeyNameMap = () => {
  const map = new Map<number, string>();
  keyGroups.forEach((group) =>
    group.keys.forEach((key) => map.set(key.id, `${group.group_name} · ${key.key_name}`))
  );
  return map;
};

const ShortcutsCard: React.FC<ShortcutsCardProps> = ({ disabled }) => {
  const labelMap = useMemo(buildKeyNameMap, []);
  const [shortcuts, setShortcuts] = useState<ShortcutEntry[]>(contextualShortcuts);
  const [isAddAppAlertOpen, setIsAddAppAlertOpen] = useState(false);
  const [isAddKeyModalOpen, setIsAddKeyModalOpen] = useState(false);
  const [activeProcess, setActiveProcess] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<number | undefined>();
  const [pendingColor, setPendingColor] = useState('#FFFFFF');

  const handleToggleApp = (processName: string) => {
    setShortcuts((prev) =>
      prev.map((entry) =>
        entry.processName === processName ? { ...entry, enabled: !entry.enabled } : entry
      )
    );
  };

  const handleRemoveKey = (processName: string, keyId: number) => {
    setShortcuts((prev) =>
      prev.map((entry) =>
        entry.processName === processName
          ? { ...entry, keys: entry.keys.filter((k) => k.keyId !== keyId) }
          : entry
      )
    );
  };

  const handleAddKey = (processName: string) => {
    setActiveProcess(processName);
    setPendingKey(undefined);
    setPendingColor('#FFFFFF');
    setIsAddKeyModalOpen(true);
  };

  const handleDeleteApp = (processName: string) => {
    setShortcuts((prev) => prev.filter((entry) => entry.processName !== processName));
  };

  const handleSaveKey = () => {
    if (!activeProcess || typeof pendingKey !== 'number') {
      return;
    }
    setShortcuts((prev) =>
      prev.map((entry) =>
        entry.processName === activeProcess
          ? {
              ...entry,
              keys: [
                ...entry.keys.filter((k) => k.keyId !== pendingKey),
                { keyId: pendingKey, color: pendingColor }
              ]
            }
          : entry
      )
    );
    setIsAddKeyModalOpen(false);
  };

  const handleAddApp = () => {
    setIsAddAppAlertOpen(true);
  };

  return (
    <LayerCard
      title="Contextual Shortcuts"
      description="Highlight contextual shortcuts per app."
      disabled={disabled}
    >
      <IonAccordionGroup>
        {shortcuts.map((entry) => (
          <IonAccordion value={entry.processName} key={entry.processName} disabled={disabled}>
            <IonItem slot="header">
              <IonLabel>
                <h3>{entry.processName}</h3>
                <IonText color={entry.enabled ? 'success' : 'medium'}>
                  {entry.enabled ? 'Enabled' : 'Disabled'}
                </IonText>
              </IonLabel>
              <IonButton
                slot="end"
                fill="clear"
                size="small"
                color={entry.enabled ? 'medium' : 'success'}
                onClick={(event) => {
                  event.stopPropagation();
                  handleToggleApp(entry.processName);
                }}
                disabled={disabled}
              >
                {entry.enabled ? 'Disable' : 'Enable'}
              </IonButton>
              <IonButton
                slot="end"
                fill="clear"
                color="danger"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDeleteApp(entry.processName);
                }}
                disabled={disabled}
              >
                <IonIcon slot="icon-only" icon={trashOutline} />
              </IonButton>
            </IonItem>

            <div slot="content" className="shortcuts-card__body">
              <IonList inset>
                {entry.keys.map((key) => {
                  const label = labelMap.get(key.keyId);
                  const parts = label ? label.split('·').map((p) => p.trim()) : [];
                  const groupLabel = parts[0] ?? 'Custom';
                  const keyLabel = parts[1] ?? label ?? String(key.keyId);

                  return (
                    <IonItem key={key.keyId} className="shortcuts-card__key-item">
                      <div className="shortcuts-card__key-meta">
                        <span className="shortcuts-card__key-badge">{keyLabel}</span>
                        <IonText color="medium">{groupLabel}</IonText>
                      </div>
                      <div
                        className="shortcuts-card__color-dot"
                        style={{ backgroundColor: key.color }}
                      />
                      <IonText className="shortcuts-card__color-label">
                        {key.color.toUpperCase()}
                      </IonText>
                      <IonButton
                        slot="end"
                        fill="clear"
                        color="danger"
                        onClick={() => handleRemoveKey(entry.processName, key.keyId)}
                        disabled={disabled}
                      >
                        <IonIcon slot="icon-only" icon={trashOutline} />
                      </IonButton>
                    </IonItem>
                  );
                })}
              </IonList>
              <IonButton
                fill="outline"
                onClick={() => handleAddKey(entry.processName)}
                disabled={disabled}
              >
                <IonIcon slot="start" icon={addOutline} />
                Add Key
              </IonButton>
            </div>
          </IonAccordion>
        ))}
      </IonAccordionGroup>
      <IonButton
        expand="block"
        onClick={handleAddApp}
        disabled={disabled}
      >
        <IonIcon slot="start" icon={addOutline} />
        Add App
      </IonButton>

      <IonAlert
        isOpen={isAddAppAlertOpen}
        header="Add Application"
        inputs={[
          {
            name: 'processName',
            type: 'text',
            placeholder: 'e.g. photoshop.exe'
          }
        ]}
        buttons={[
          { text: 'Cancel', role: 'cancel', handler: () => setIsAddAppAlertOpen(false) },
          {
            text: 'Add',
            handler: (data) => {
              const name = (data?.processName ?? '').trim();
              if (!name) {
                setIsAddAppAlertOpen(false);
                return;
              }
              setShortcuts((prev) => {
                if (prev.some((entry) => entry.processName === name)) {
                  return prev;
                }
                return [...prev, { processName: name, enabled: true, keys: [] }];
              });
              setIsAddAppAlertOpen(false);
            }
          }
        ]}
        onDidDismiss={() => setIsAddAppAlertOpen(false)}
      />

      <IonModal isOpen={isAddKeyModalOpen} onDidDismiss={() => setIsAddKeyModalOpen(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Add Shortcut Key</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setIsAddKeyModalOpen(false)}>
                <IonIcon slot="icon-only" icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <KeyPicker
            label="Select Key"
            multiple={false}
            value={pendingKey}
            onChange={(value) => {
              if (Array.isArray(value)) {
                setPendingKey(value[0]);
              } else {
                setPendingKey(typeof value === 'number' ? value : undefined);
              }
            }}
          />
          <ColorPicker value={pendingColor} onChange={setPendingColor} />
          <div className="shortcuts-card__modal-actions">
            <IonButton
              fill="clear"
              onClick={() => setIsAddKeyModalOpen(false)}
            >
              Cancel
            </IonButton>
            <IonButton
              onClick={handleSaveKey}
              disabled={typeof pendingKey !== 'number'}
            >
              <IonIcon slot="start" icon={saveOutline} />
              Save
            </IonButton>
          </div>
        </IonContent>
      </IonModal>
    </LayerCard>
  );
};

export default ShortcutsCard;
