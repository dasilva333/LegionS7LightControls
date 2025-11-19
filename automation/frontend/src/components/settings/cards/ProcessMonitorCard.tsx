import React, { useEffect, useState } from 'react';
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
import { apiClient } from '../../../config/api';

type ProcessMonitorCardProps = {
  disabled?: boolean;
};

type ProcessEntry = {
  id: number;
  process_name: string;
  profile_filename: string;
  is_active: boolean;
  priority: number;
};

const ProcessMonitorCard: React.FC<ProcessMonitorCardProps> = ({ disabled }) => {
  const [processes, setProcesses] = useState<ProcessEntry[]>([]);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProcesses = async () => {
    try {
      const data = await apiClient.get<ProcessEntry[]>('/processes');
      setProcesses(data);
    } catch (error) {
      console.error('[ProcessMonitorCard] Failed to fetch processes', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, []);

  const handleToggle = async (id: number, checked: boolean) => {
    setProcesses((prev) =>
      prev.map((proc) => (proc.id === id ? { ...proc, is_active: checked } : proc))
    );
    try {
      await apiClient.put(`/processes/${id}`, { is_active: checked });
    } catch (error) {
      console.error('[ProcessMonitorCard] Failed to update process', error);
      fetchProcesses();
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await apiClient.delete(`/processes/${id}`);
      setProcesses((prev) => prev.filter((proc) => proc.id !== id));
    } catch (error) {
      console.error('[ProcessMonitorCard] Failed to delete process', error);
    }
  };

  const handleCreate = async (processName: string) => {
    try {
      const payload = {
        process_name: processName,
        profile_filename: 'aurora_sync',
        is_active: true,
        priority: 0
      };
      const created = await apiClient.post<ProcessEntry>('/processes', payload);
      setProcesses((prev) => [...prev, created]);
    } catch (error) {
      console.error('[ProcessMonitorCard] Failed to create process', error);
    }
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
                handleCreate(value);
              }
              setIsAlertOpen(false);
            }
          }
        ]}
        onDidDismiss={() => setIsAlertOpen(false)}
      />
      <IonList inset>
        {!processes.length && isLoading && (
          <IonItem lines="none">
            <IonLabel>Loading processes…</IonLabel>
          </IonItem>
        )}
        {processes.map((proc) => (
          <IonItem key={proc.id}>
            <IonLabel>
              <h3>{proc.process_name}</h3>
              <p>Passthrough when running</p>
            </IonLabel>
            <IonToggle
              checked={proc.is_active}
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
