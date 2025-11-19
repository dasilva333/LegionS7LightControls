import React, { useEffect, useState } from 'react';
import { IonCheckbox, IonItem, IonLabel, IonNote } from '@ionic/react';
import LayerCard from '../../shared/LayerCard';
import KeyPicker from '../../shared/KeyPicker';
import { apiClient } from '../../../config/api';

type WeatherCardProps = {
  disabled?: boolean;
};

const WeatherCard: React.FC<WeatherCardProps> = ({ disabled }) => {
  const [enabled, setEnabled] = useState(true);
  const [stormOverride, setStormOverride] = useState(false);
  const [overrideKeys, setOverrideKeys] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const controlsDisabled = disabled || !enabled || isLoading;

  const applyState = (state: {
    weatherEnabled?: boolean;
    stormOverride?: boolean;
    weatherKeys?: number[];
  }) => {
    if (typeof state.weatherEnabled === 'boolean') setEnabled(state.weatherEnabled);
    if (typeof state.stormOverride === 'boolean') setStormOverride(state.stormOverride);
    if (Array.isArray(state.weatherKeys)) {
      setOverrideKeys(state.weatherKeys.filter((id): id is number => typeof id === 'number'));
    }
  };

  const fetchState = async () => {
    try {
      const data = await apiClient.get<{
        weatherEnabled?: boolean;
        stormOverride?: boolean;
        weatherKeys?: number[];
      }>('/api/godmode/state');
      applyState(data);
    } catch (error) {
      console.error('[WeatherCard] Failed to load state', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  const persistState = async (partial: Record<string, unknown>) => {
    try {
      const response = await apiClient.post<{ state?: Record<string, unknown> }>('/api/godmode/state', partial);
      if (response?.state) {
        applyState(response.state as any);
      }
    } catch (error) {
      console.error('[WeatherCard] Failed to update state', error);
    }
  };

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    persistState({ weatherEnabled: checked });
  };

  const handleStormOverrideChange = (checked: boolean) => {
    setStormOverride(checked);
    persistState({ stormOverride: checked });
  };

  const handleKeysChange = (selection: number | number[] | undefined) => {
    if (Array.isArray(selection)) {
      const keys = selection.filter((id): id is number => typeof id === 'number');
      setOverrideKeys(keys);
      persistState({ weatherKeys: keys });
    } else if (typeof selection === 'number') {
      setOverrideKeys([selection]);
      persistState({ weatherKeys: [selection] });
    } else {
      setOverrideKeys([]);
      persistState({ weatherKeys: [] });
    }
  };

  return (
    <LayerCard
      title="Weather Control"
      description="Monitor local weather conditions and storm overrides."
      toggleState={enabled}
      onToggle={handleToggle}
      disabled={disabled}
    >
      <IonItem lines="none">
        <IonLabel>Storm Override</IonLabel>
        <IonCheckbox
          slot="end"
          checked={stormOverride}
          onIonChange={(event) => handleStormOverrideChange(event.detail.checked)}
          disabled={controlsDisabled}
        />
      </IonItem>
      <IonNote color="medium">
        If checked, intense rain or storms will temporarily replace your background layer with a rain animation.
      </IonNote>

      <KeyPicker
        label="Dedicated Weather Keys"
        helperText="Select keys to ALWAYS display the current weather status (Sunny/Cloudy/Rain), even if the storm override is off."
        multiple
        value={overrideKeys}
        onChange={handleKeysChange}
        disabled={controlsDisabled}
      />
    </LayerCard>
  );
};

export default WeatherCard;
