import React, { useEffect, useState, useRef } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonGrid,
  IonRow,
  IonCol,
  useIonViewWillEnter,
  useIonViewWillLeave
} from '@ionic/react';
import StatusHero from '../components/dashboard/StatusHero';
import LayerStack from '../components/dashboard/LayerStack';
import QuickActions from '../components/dashboard/QuickActions';
import VirtualKeyboard from '../components/dashboard/VirtualKeyboard';
import { apiClient } from '../config/api';
import { GodModeState } from '../types/GodModeState';

const Dashboard: React.FC = () => {
  const [state, setState] = useState<GodModeState>({});
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchState = async () => {
    try {
      const data = await apiClient.get<GodModeState>('/api/godmode/state');
      setState(data);
    } catch (e) {
      console.error('Failed to fetch GodMode state', e);
    }
  };

  useIonViewWillEnter(() => {
    fetchState();
    pollRef.current = setInterval(fetchState, 5000); // Poll every 5s
  });

  useIonViewWillLeave(() => {
    if (pollRef.current) clearInterval(pollRef.current);
  });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Dashboard</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <IonGrid>
          <IonRow>
            <IonCol size="12">
              <StatusHero state={state} />
            </IonCol>
          </IonRow>

          <IonRow>
            <IonCol size="12" sizeMd="8">
              <VirtualKeyboard state={state} />
            </IonCol>
            <IonCol size="12" sizeMd="4">
              <LayerStack state={state} />
              <QuickActions />
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default Dashboard;
