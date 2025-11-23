import React from 'react';
import {
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon,
    IonGrid,
    IonRow,
    IonCol
} from '@ionic/react';
import { gameControllerOutline, gridOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';

import './Games.css';

const Games: React.FC = () => {
    const history = useHistory();

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Games</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
                <IonGrid>
                    <IonRow>
                        <IonCol size="12" sizeMd="6">
                            <IonCard className="game-card" button onClick={() => history.push('/snake')}>
                                <IonCardHeader>
                                    <IonCardTitle>
                                        <IonIcon icon={gameControllerOutline} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
                                        Snake
                                    </IonCardTitle>
                                </IonCardHeader>
                                <IonCardContent>
                                    Classic Snake game. Eat food, grow longer, don&apos;t hit the walls!
                                </IonCardContent>
                            </IonCard>
                        </IonCol>
                        <IonCol size="12" sizeMd="6">
                            <IonCard className="game-card" button onClick={() => history.push('/breakout')}>
                                <IonCardHeader>
                                    <IonCardTitle>
                                        <IonIcon icon={gridOutline} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
                                        Breakout
                                    </IonCardTitle>
                                </IonCardHeader>
                                <IonCardContent>
                                    Classic Breakout game. Smash bricks, keep the ball in play!
                                </IonCardContent>
                            </IonCard>
                        </IonCol>
                        <IonCol size="12" sizeMd="6">
                            <IonCard className="game-card" button onClick={() => history.push('/pong')}>
                                <IonCardHeader>
                                    <IonCardTitle>
                                        <IonIcon icon={gameControllerOutline} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
                                        Pong
                                    </IonCardTitle>
                                </IonCardHeader>
                                <IonCardContent>
                                    Vertical Pong vs CPU. You are the Top Paddle!
                                </IonCardContent>
                            </IonCard>
                        </IonCol>
                    </IonRow>
                </IonGrid>
            </IonContent>
        </IonPage>
    );
};

export default Games;
