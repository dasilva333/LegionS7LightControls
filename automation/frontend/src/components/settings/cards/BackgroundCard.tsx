import React, { useEffect, useState } from 'react';
import {
  IonButton,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonRange,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonText
} from '@ionic/react';
import LayerCard from '../../shared/LayerCard';
import ColorPicker from '../../shared/ColorPicker';
import { apiClient } from '../../../config/api';

type BackgroundCardProps = {
  disabled?: boolean;
};

type Mode = 'none' | 'time' | 'effect';
type EffectType = 'Ripple' | 'Wave' | 'Fade' | 'Checkerboard';

type GradientResponse = {
  id: number;
  start_time?: string;
  end_time?: string;
  start_rgb?: string;
  end_rgb?: string;
  startTime?: string;
  endTime?: string;
  startRgb?: string;
  endRgb?: string;
};

type GodModeStateResponse = {
  backgroundMode?: Mode;
  timeUpdateRate?: number;
  effectSettings?: {
    effectType?: string;
    baseColor?: string;
    speed?: number;
  };
};

const BackgroundCard: React.FC<BackgroundCardProps> = ({ disabled }) => {
  const [mode, setMode] = useState<Mode>('none');
  const [updateRate, setUpdateRate] = useState(1);
  const [effectType, setEffectType] = useState<EffectType>('Ripple');
  const [effectSpeed, setEffectSpeed] = useState(3);
  const [baseColor, setBaseColor] = useState('#0070FF');
  const [gradients, setGradients] = useState<GradientResponse[]>([]);
  const [isLoadingState, setIsLoadingState] = useState(true);
  const [isLoadingGradients, setIsLoadingGradients] = useState(true);

  const effectTypes: EffectType[] = ['Ripple', 'Wave', 'Fade', 'Checkerboard'];
  const controlsDisabled = disabled || isLoadingState;

  const normalizeGradient = (gradient: GradientResponse) => ({
    id: gradient.id,
    startTime: gradient.start_time ?? gradient.startTime ?? '',
    endTime: gradient.end_time ?? gradient.endTime ?? '',
    startRgb: gradient.start_rgb ?? gradient.startRgb ?? '#000000',
    endRgb: gradient.end_rgb ?? gradient.endRgb ?? '#000000'
  });

  const fetchState = async () => {
    try {
      const data = await apiClient.get<GodModeStateResponse>('/api/godmode/state');
      if (data.backgroundMode) setMode(data.backgroundMode);
      if (typeof data.timeUpdateRate === 'number') setUpdateRate(data.timeUpdateRate);
      const fx = data.effectSettings || {};
      if (fx.effectType) setEffectType(fx.effectType as EffectType);
      if (typeof fx.speed === 'number') setEffectSpeed(fx.speed);
      if (fx.baseColor) setBaseColor(fx.baseColor);
    } catch (error) {
      console.error('[BackgroundCard] Failed to load state', error);
    } finally {
      setIsLoadingState(false);
    }
  };

  const fetchGradients = async () => {
    try {
      const data = await apiClient.get<GradientResponse[]>('/time-gradients');
      setGradients(data.map(normalizeGradient));
    } catch (error) {
      console.error('[BackgroundCard] Failed to load gradients', error);
    } finally {
      setIsLoadingGradients(false);
    }
  };

  useEffect(() => {
    fetchState();
    fetchGradients();
  }, []);

  const persistState = async (partial: Record<string, unknown>) => {
    try {
      const response = await apiClient.post<{ state?: GodModeStateResponse }>('/api/godmode/state', partial);
      if (response?.state) {
        const next = response.state;
        if (next.backgroundMode) setMode(next.backgroundMode);
        if (typeof next.timeUpdateRate === 'number') setUpdateRate(next.timeUpdateRate);
        const fx = next.effectSettings || {};
        if (fx.effectType) setEffectType(fx.effectType as EffectType);
        if (typeof fx.speed === 'number') setEffectSpeed(fx.speed);
        if (fx.baseColor) setBaseColor(fx.baseColor);
      }
    } catch (error) {
      console.error('[BackgroundCard] Failed to update state', error);
    }
  };

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    persistState({ backgroundMode: newMode });
  };

  const handleUpdateRateChange = (value?: string | number | null) => {
    const parsed = Number(value ?? updateRate);
    const nextRate = Number.isNaN(parsed) ? updateRate : Math.max(1, parsed);
    setUpdateRate(nextRate);
    persistState({ timeUpdateRate: nextRate });
  };

  const handleEffectTypeChange = (value: EffectType) => {
    setEffectType(value);
    persistState({
      effectSettings: { effectType: value, baseColor, speed: effectSpeed }
    });
  };

  const handleEffectSpeedChange = (value?: number | null) => {
    const nextSpeed = typeof value === 'number' ? value : effectSpeed;
    setEffectSpeed(nextSpeed);
    persistState({
      effectSettings: { effectType, baseColor, speed: nextSpeed }
    });
  };

  const handleBaseColorChange = (color: string) => {
    setBaseColor(color);
    persistState({
      effectSettings: { effectType, baseColor: color, speed: effectSpeed }
    });
  };

  const renderTimeContent = () => (
    <>
      <IonItem>
        <IonLabel position="stacked">Update Rate (minutes)</IonLabel>
        <IonInput
          type="number"
          min="1"
          value={updateRate}
          onIonChange={(event) => handleUpdateRateChange(event.detail.value)}
          disabled={controlsDisabled}
        />
      </IonItem>
      <IonList inset>
        <IonListHeader>
          <IonLabel>Time of Day Gradients</IonLabel>
        </IonListHeader>
        {isLoadingGradients && (
          <IonItem lines="none">
            <IonText color="medium">Loading gradients…</IonText>
          </IonItem>
        )}
        {!isLoadingGradients &&
          gradients.map((gradient) => (
            <IonItem key={gradient.id}>
              <IonLabel>
                <h3>
                  {gradient.startTime} - {gradient.endTime}
                </h3>
                <IonText color="medium">
                  {gradient.startRgb} - {gradient.endRgb}
                </IonText>
              </IonLabel>
              <IonButton size="small" fill="clear" disabled={controlsDisabled}>
                Edit
              </IonButton>
              <IonButton size="small" fill="clear" color="danger" disabled={controlsDisabled}>
                Delete
              </IonButton>
            </IonItem>
          ))}
      </IonList>
      <IonButton expand="block" disabled={controlsDisabled}>
        + Add New Gradient
      </IonButton>
    </>
  );

  const renderEffectContent = () => (
    <>
      <IonItem>
        <IonLabel>Effect Type</IonLabel>
        <IonSelect
          interface="popover"
          value={effectType}
          onIonChange={(event) => handleEffectTypeChange((event.detail.value as EffectType) || 'Ripple')}
          disabled={controlsDisabled}
        >
          {effectTypes.map((type) => (
            <IonSelectOption key={type} value={type}>
              {type}
            </IonSelectOption>
          ))}
        </IonSelect>
      </IonItem>
      <IonItem lines="none">
        <IonLabel>Base Color</IonLabel>
        <ColorPicker value={baseColor} onChange={handleBaseColorChange} disabled={controlsDisabled} />
      </IonItem>
      <IonItem>
        <IonLabel>Speed</IonLabel>
        <IonRange
          pin
          value={effectSpeed}
          min={1}
          max={5}
          step={1}
          onIonChange={(event) => handleEffectSpeedChange(Number(event.detail.value ?? effectSpeed))}
          disabled={controlsDisabled}
        >
          <IonLabel slot="start">Slow</IonLabel>
          <IonLabel slot="end">Fast</IonLabel>
        </IonRange>
      </IonItem>
    </>
  );

  return (
    <LayerCard title="Background Controller" description="Configure the environment layer." disabled={disabled}>
      <IonSegment
        value={mode}
        onIonChange={(event) => handleModeChange(event.detail.value as Mode)}
        disabled={controlsDisabled}
      >
        <IonSegmentButton value="none">
          <IonLabel>None</IonLabel>
        </IonSegmentButton>
        <IonSegmentButton value="time">
          <IonLabel>Time of Day</IonLabel>
        </IonSegmentButton>
        <IonSegmentButton value="effect">
          <IonLabel>Effect</IonLabel>
        </IonSegmentButton>
      </IonSegment>

      {mode === 'none' && (
        <IonItem lines="none">
          <IonText color="medium">
            Background layer is disabled. Unassigned keys will remain off (black).
          </IonText>
        </IonItem>
      )}

      {mode === 'time' && renderTimeContent()}
      {mode === 'effect' && renderEffectContent()}
    </LayerCard>
  );
};

export default BackgroundCard;
