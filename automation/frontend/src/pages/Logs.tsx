import React from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';

const Logs: React.FC = () => (
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonTitle>System Logs</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent fullscreen>
      {/* Socket log output will be rendered here */}
    </IonContent>
  </IonPage>
);

export default Logs;
