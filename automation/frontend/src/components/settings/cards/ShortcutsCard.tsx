import React, { useEffect, useMemo, useState } from 'react';
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
import keyGroups from '../../../fixtures/keyGroups.json';
import KeyPicker from '../../shared/KeyPicker';
import ColorPicker from '../../shared/ColorPicker';
import { apiClient } from '../../../config/api';
import './ShortcutsCard.css';

type ShortcutsCardProps = {
  disabled?: boolean;
};

type ShortcutEntry = {
  id: number;
  processName: string;
  isActive: boolean;
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
  const [shortcuts, setShortcuts] = useState<ShortcutEntry[]>([]);
  const [isAddAppAlertOpen, setIsAddAppAlertOpen] = useState(false);
  const [isAddKeyModalOpen, setIsAddKeyModalOpen] = useState(false);
  const [activeShortcutId, setActiveShortcutId] = useState<number | null>(null);
  const [pendingKey, setPendingKey] = useState<number | undefined>();
  const [pendingColor, setPendingColor] = useState('#FFFFFF');
  const [isLoading, setIsLoading] = useState(true);

  const fetchShortcuts = async () => {
    try {
      const data = await apiClient.get<ShortcutEntry[]>('/api/shortcuts');
      setShortcuts(data);
    } catch (error) {
      console.error('[ShortcutsCard] Failed to fetch shortcuts', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShortcuts();
  }, []);

  const handleToggleApp = async (shortcut: ShortcutEntry) => {
    const nextState = !shortcut.isActive;
    setShortcuts((prev) =>
      prev.map((entry) =>
        entry.id === shortcut.id ? { ...entry, isActive: nextState } : entry
      )
    );
    try {
      await apiClient.put(`/api/shortcuts/${shortcut.id}`, { isActive: nextState });
    } catch (error) {
      console.error('[ShortcutsCard] Failed to toggle shortcut', error);
      fetchShortcuts();
    }
  };

  const handleRemoveKey = async (shortcut: ShortcutEntry, keyId: number) => {
    const nextKeys = shortcut.keys.filter((k) => k.keyId !== keyId);
    setShortcuts((prev) =>
      prev.map((entry) =>
        entry.id === shortcut.id ? { ...entry, keys: nextKeys } : entry
      )
    );
    try {
      await apiClient.put(`/api/shortcuts/${shortcut.id}`, { keys: nextKeys });
    } catch (error) {
      console.error('[ShortcutsCard] Failed to remove key', error);
      fetchShortcuts();
    }
  };

  const handleAddKey = (shortcutId: number) => {
    setActiveShortcutId(shortcutId);
    setPendingKey(undefined);
    setPendingColor('#FFFFFF');
    setIsAddKeyModalOpen(true);
  };

  const handleDeleteApp = async (id: number) => {
    try {
      await apiClient.delete(`/api/shortcuts/${id}`);
      setShortcuts((prev) => prev.filter((entry) => entry.id !== id));
    } catch (error) {
      console.error('[ShortcutsCard] Failed to delete shortcut', error);
    }
  };

  const handleSaveKey = async () => {
    if (!activeShortcutId || typeof pendingKey !== 'number') {
      return;
    }
    const nextKeys = (shortcuts.find((entry) => entry.id === activeShortcutId)?.keys || [])
      .filter((k) => k.keyId !== pendingKey)
      .concat({ keyId: pendingKey, color: pendingColor });

    setShortcuts((prev) =>
      prev.map((entry) =>
        entry.id === activeShortcutId ? { ...entry, keys: nextKeys } : entry
      )
    );
    setIsAddKeyModalOpen(false);
    try {
      await apiClient.put(`/api/shortcuts/${activeShortcutId}`, { keys: nextKeys });
    } catch (error) {
      console.error('[ShortcutsCard] Failed to save key', error);
      fetchShortcuts();
    }
  };

  const handleCreateApp = async (name: string) => {
    try {
      const created = await apiClient.post<ShortcutEntry>('/api/shortcuts', {
        processName: name,
        keys: [],
        isActive: true
      });
      setShortcuts((prev) => [...prev, created]);
    } catch (error) {
      console.error('[ShortcutsCard] Failed to create app', error);
    }
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
          <IonAccordion value={entry.processName} key={entry.id} disabled={disabled}>
            <IonItem slot="header">
              <IonLabel>
                <h3>{entry.processName}</h3>
                <IonText color={entry.isActive ? 'success' : 'medium'}>
                  {entry.isActive ? 'Enabled' : 'Disabled'}
                </IonText>
              </IonLabel>
              <IonButton
                slot="end"
                fill="clear"
                size="small"
                color={entry.isActive ? 'medium' : 'success'}
                onClick={(event) => {
                  event.stopPropagation();
                  handleToggleApp(entry);
                }}
                disabled={disabled}
              >
                {entry.isActive ? 'Disable' : 'Enable'}
              </IonButton>
              <IonButton
                slot="end"
                fill="clear"
                color="danger"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDeleteApp(entry.id);
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
              onClick={() => handleRemoveKey(entry, key.keyId)}
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
                onClick={() => handleAddKey(entry.id)}
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
                  handleCreateApp(name);
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

