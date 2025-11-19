import React, { useMemo, useState } from 'react';
import {
  IonAlert,
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonToggle
} from '@ionic/react';
import { trashOutline, addOutline } from 'ionicons/icons';
import LayerCard from '../../shared/LayerCard';
import gamingModeProcesses from '../../../fixtures/gamingModeProcesses.json';

type ProcessMonitorCardProps = {
  disabled?: boolean;
};

type ProcessEntry = {
  id: number;
  processName: string;
  enabled: boolean;
};

const ProcessMonitorCard: React.FC<ProcessMonitorCardProps> = ({ disabled }) => {
  const initialProcesses = useMemo<ProcessEntry[]>(
    () => gamingModeProcesses.map((proc) => ({ ...proc })),
    []
  );
  const [processes, setProcesses] = useState<ProcessEntry[]>(initialProcesses);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const handleToggle = (id: number, checked: boolean) => {
    setProcesses((prev) =>
      prev.map((proc) => (proc.id === id ? { ...proc, enabled: checked } : proc))
    );
  };

  const handleRemove = (id: number) => {
    setProcesses((prev) => prev.filter((proc) => proc.id !== id));
  };

  const handleAdd = () => {
    setIsAlertOpen(true);
  };

  return (
    <LayerCard
      title="Process Monitor"
      description="Automatically disable God Mode when certain games are running."
      disabled={disabled}
    >
      <IonAlert
        isOpen={isAlertOpen}
        header="Add Process"
        subHeader="Enter the executable name"
        inputs={[
          {
            name: 'processName',
            type: 'text',
            placeholder: 'e.g. csgo.exe'
          }
        ]}
        buttons={[
          {
            text: 'Cancel',
            role: 'cancel',
            handler: () => setIsAlertOpen(false)
          },
          {
            text: 'Add',
            handler: (data) => {
              const value = (data?.processName ?? '').trim();
              if (value) {
                const nextId = Math.max(0, ...processes.map((proc) => proc.id)) + 1;
                setProcesses((prev) => [
                  ...prev,
                  { id: nextId, processName: value, enabled: true }
                ]);
              }
              setIsAlertOpen(false);
            }
          }
        ]}
        onDidDismiss={() => setIsAlertOpen(false)}
      />
      <IonList inset>
        {processes.map((proc) => (
          <IonItem key={proc.id}>
            <IonLabel>
              <h3>{proc.processName}</h3>
              <p>Passthrough when running</p>
            </IonLabel>
            <IonToggle
              checked={proc.enabled}
              onIonChange={(event) => handleToggle(proc.id, event.detail.checked)}
              disabled={disabled}
            />
            <IonButton
              slot="end"
              fill="clear"
              color="danger"
              onClick={() => handleRemove(proc.id)}
              disabled={disabled}
            >
              <IonIcon slot="icon-only" icon={trashOutline} />
            </IonButton>
          </IonItem>
        ))}
      </IonList>
      <IonButton
        expand="block"
        onClick={handleAdd}
        disabled={disabled}
      >
        <IonIcon slot="start" icon={addOutline} />
        Add Process
      </IonButton>
    </LayerCard>
  );
};

export default ProcessMonitorCard;
