import React, { useEffect, useState } from 'react';
import {
  IonButton,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonText
} from '@ionic/react';
import { trashOutline } from 'ionicons/icons';
import LayerCard from '../../shared/LayerCard';
import ColorPicker from '../../shared/ColorPicker';
import KeyPicker from '../../shared/KeyPicker';
import { apiClient } from '../../../config/api';
import './TemperatureCard.css';

type TemperatureCardProps = {
  disabled?: boolean;
};

type TemperatureRange = {
  min?: number | null;
  max?: number | null;
  color?: string;
};

type TemperatureConfig = {
  enabled?: boolean;
  ranges?: TemperatureRange[];
  targetKeys?: number[];
};

const DEFAULT_CONFIG: TemperatureConfig = {
  enabled: true,
  ranges: [
    { min: null, max: 72, color: '#2A4BFF' },
    { min: 73, max: 78, color: '#24FF54' },
    { min: 79, max: 83, color: '#A6FF4D' },
    { min: 84, max: 90, color: '#FF3B30' },
    { min: 91, max: null, color: '#FF8C00' }
  ],
  targetKeys: []
};

const TemperatureCard: React.FC<TemperatureCardProps> = ({ disabled }) => {
  const [enabled, setEnabled] = useState(DEFAULT_CONFIG.enabled!);
  const [ranges, setRanges] = useState<TemperatureRange[]>(DEFAULT_CONFIG.ranges || []);
  const [targetKeys, setTargetKeys] = useState<number[]>(DEFAULT_CONFIG.targetKeys || []);
  const [loading, setLoading] = useState(true);

  const widgetId = 'temperature';

  const controlsDisabled = disabled || !enabled || loading;

  const persist = async (overrides: TemperatureConfig) => {
    const nextConfig = {
      enabled,
      ranges,
      targetKeys,
      ...overrides
    };
    setEnabled(nextConfig.enabled ?? enabled);
    if (Array.isArray(nextConfig.ranges)) setRanges(nextConfig.ranges);
    if (Array.isArray(nextConfig.targetKeys)) setTargetKeys(nextConfig.targetKeys);
    try {
      await apiClient.post(`/api/widgets/${widgetId}`, { config: nextConfig });
    } catch (error) {
      console.error('[TemperatureCard] Failed to persist config', error);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiClient.get<{ config: TemperatureConfig }>(`/api/widgets/${widgetId}`);
        const cfg = response.config || {};
        setEnabled(cfg.enabled ?? DEFAULT_CONFIG.enabled!);
        if (Array.isArray(cfg.ranges) && cfg.ranges.length > 0) {
          setRanges(cfg.ranges);
        } else {
          setRanges(DEFAULT_CONFIG.ranges || []);
        }
        setTargetKeys(cfg.targetKeys ?? DEFAULT_CONFIG.targetKeys!);
      } catch (error) {
        console.error('[TemperatureCard] Failed to load config', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleKeysChange = (selection: number | number[] | undefined) => {
    const keys = Array.isArray(selection)
      ? selection.filter((id): id is number => typeof id === 'number')
      : typeof selection === 'number'
        ? [selection]
        : [];
    setTargetKeys(keys);
    persist({ targetKeys: keys });
  };

  // sanitizeNumber removed (unused)

  const sanitizeOptionalNumber = (value: string, fallback?: number | null) => {
    if (value === '') return null;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return fallback ?? null;
    }
    return parsed;
  };

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    persist({ enabled: checked });
  };

  const updateRange = (index: number, partial: Partial<TemperatureRange>) => {
    const nextRanges = ranges.map((range, i) =>
      i === index ? { ...range, ...partial } : range
    );
    setRanges(nextRanges);
    persist({ ranges: nextRanges });
  };

  const handleAddRange = () => {
    const nextRanges = [
      ...ranges,
      {
        min: null,
        max: null,
        color: '#24FF54'
      }
    ];
    setRanges(nextRanges);
    persist({ ranges: nextRanges });
  };

  const handleRemoveRange = (index: number) => {
    const nextRanges = ranges.filter((_, i) => i !== index);
    setRanges(nextRanges);
    persist({ ranges: nextRanges });
  };

  const sortedRanges = [...ranges].sort((a, b) => (a.min ?? -999) - (b.min ?? -999));

  // Calculate total span for visualization
  const validMin = sortedRanges.length > 0 ? (sortedRanges[0].min ?? 0) : 0;
  const validMax = sortedRanges.length > 0 ? (sortedRanges[sortedRanges.length - 1].max ?? 100) : 100;
  const totalSpan = Math.max(1, validMax - validMin);

  return (
    <LayerCard
      title="Temperature Gauge"
      description="Map ambient or forecast temperatures to dedicated keys."
      toggleState={enabled}
      onToggle={handleToggle}
      disabled={disabled}
    >
      <IonNote color="medium" style={{ fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>
        Map temperature ranges to fixed colors so you can read the feel at a glance.
      </IonNote>

      {/* Temperature Visualizer Bar */}
      <div className="temperature-card__visualizer">
        {sortedRanges.map((range, i) => {
          const min = range.min ?? validMin;
          const max = range.max ?? validMax;
          const width = ((max - min) / totalSpan) * 100;
          return (
            <div
              key={`vis-${i}`}
              className="temperature-card__visualizer-segment"
              style={{
                backgroundColor: range.color,
                width: `${width}%`,
                opacity: controlsDisabled ? 0.3 : 1
              }}
              title={`${range.min ?? 'Min'} - ${range.max ?? 'Max'}°F`}
            />
          );
        })}
      </div>

      <div className="temperature-card__list">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <IonLabel style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--ion-color-primary)' }}>
            Temperature Ranges
          </IonLabel>
          {ranges.length > 0 && (
            <IonNote color="medium" style={{ fontSize: '0.8rem' }}>
              {ranges.length} mapped {ranges.length === 1 ? 'range' : 'ranges'}
            </IonNote>
          )}
        </div>

        {ranges.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <IonText color="medium">No ranges yet. Add one to get started.</IonText>
          </div>
        )}

        {ranges.map((range, index) => (
          <div key={`temp-range-${index}`} className="temperature-card__range-item">
            <div className="temperature-card__grid">
              <div className="temperature-card__input-group">
                <span className="temperature-card__label">Min</span>
                <IonItem lines="none" className="temperature-card__ion-item">
                  <IonInput
                    type="number"
                    placeholder="Min"
                    value={range.min ?? ''}
                    onIonChange={(event) => {
                      const value = sanitizeOptionalNumber(
                        event.detail.value ?? '',
                        typeof range.min === 'number' ? range.min : null
                      );
                      updateRange(index, { min: value });
                    }}
                    disabled={controlsDisabled}
                  />
                </IonItem>
              </div>

              <div className="temperature-card__input-group">
                <span className="temperature-card__label">Max</span>
                <IonItem lines="none" className="temperature-card__ion-item">
                  <IonInput
                    type="number"
                    placeholder="Max"
                    value={range.max ?? ''}
                    onIonChange={(event) => {
                      const value = sanitizeOptionalNumber(
                        event.detail.value ?? '',
                        typeof range.max === 'number' ? range.max : null
                      );
                      updateRange(index, { max: value });
                    }}
                    disabled={controlsDisabled}
                  />
                </IonItem>
              </div>

              <div className="temperature-card__color-group">
                <ColorPicker
                  value={range.color || '#24FF54'}
                  onChange={(value) => updateRange(index, { color: value })}
                  disabled={controlsDisabled}
                />
                <IonLabel className="temperature-card__label" style={{ opacity: 0.3 }}>Mapping</IonLabel>
              </div>

              <IonButton
                color="danger"
                fill="clear"
                className="temperature-card__delete-btn"
                onClick={() => handleRemoveRange(index)}
                disabled={controlsDisabled}
              >
                <IonIcon icon={trashOutline} slot="icon-only" />
              </IonButton>
            </div>
          </div>
        ))}

        <IonButton
          expand="block"
          fill="clear"
          className="temperature-card__add-btn"
          disabled={controlsDisabled}
          onClick={handleAddRange}
        >
          + Add Temperature Range
        </IonButton>
      </div>

      <div style={{ marginTop: '24px' }}>
        <KeyPicker
          label="Target Keys"
          helperText="Select keys that should display the temperature color."
          multiple
          value={targetKeys}
          onChange={handleKeysChange}
          disabled={controlsDisabled}
        />
      </div>

      <IonNote color="medium" style={{ fontSize: '0.8rem', marginTop: '12px', display: 'block' }}>
        Ranges can overlap or leave gaps; the closest match wins.
      </IonNote>
    </LayerCard>
  );
};

export default TemperatureCard;
