import React, { useEffect, useState } from "react";
import {
  IonButton,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonRange,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonText,
} from "@ionic/react";
import LayerCard from "../../shared/LayerCard";
import ColorPicker from "../../shared/ColorPicker";
import { apiClient } from "../../../config/api";
import { trashOutline } from "ionicons/icons";
import GradientModal, { GradientData } from "../modals/GradientModal";

type BackgroundCardProps = {
  disabled?: boolean;
};

type Mode = "none" | "effect"; // Removed 'time'
type EffectType = "Solid" | "Ripple" | "Wave" | "Fade" | "Checkerboard" | "Sonar" | "Raindrops" | "Heatmap";
type ColorSource = "Static" | "Time of Day" | "Spectrum";

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
  timeOfDay?: number;
  // Removed timeUpdateRate from root, kept in effectSettings if needed
  effectSettings?: {
    effectType?: string;
    colorSource?: string; // New Field
    baseColor?: string;
    speed?: number;
  };
};

const BackgroundCard: React.FC<BackgroundCardProps> = ({ disabled }) => {
  const [mode, setMode] = useState<Mode>("none");
  const [timeOfDay, setTimeOfDay] = useState<number>(0);

  // Effect Settings
  const [effectType, setEffectType] = useState<EffectType>("Solid");
  const [colorSource, setColorSource] = useState<ColorSource>("Static");
  const [effectSpeed, setEffectSpeed] = useState(3);
  const [baseColor, setBaseColor] = useState("#0070FF");

  // Time Gradient Data
  const [gradients, setGradients] = useState<GradientResponse[]>([]);
  const [isLoadingState, setIsLoadingState] = useState(true);
  const [isLoadingGradients, setIsLoadingGradients] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGradient, setEditingGradient] = useState<GradientData | null>(null);

  const effectTypes: EffectType[] = ["Solid", "Ripple", "Wave", "Fade", "Checkerboard", "Sonar", "Raindrops", "Heatmap"];
  const colorSources: ColorSource[] = ["Static", "Time of Day", "Spectrum"];

  const controlsDisabled = disabled || isLoadingState;

  const normalizeGradient = (gradient: GradientResponse) => ({
    id: gradient.id,
    startTime: gradient.start_time ?? gradient.startTime ?? "",
    endTime: gradient.end_time ?? gradient.endTime ?? "",
    startRgb: gradient.start_rgb ?? gradient.startRgb ?? "#000000",
    endRgb: gradient.end_rgb ?? gradient.endRgb ?? "#000000",
  });

  const fetchState = async () => {
    try {
      const data = await apiClient.get<GodModeStateResponse>("/api/godmode/state");

      // Migrate old 'time' mode to 'effect' mode with source 'Time of Day'
      let bgMode = data.backgroundMode;
      if (bgMode as any === 'time') bgMode = 'effect';
      if (bgMode) setMode(bgMode);
      if (typeof data.timeOfDay === 'number') setTimeOfDay(data.timeOfDay);

      const fx = data.effectSettings || {};
      if (fx.effectType) setEffectType(fx.effectType as EffectType);
      if (fx.colorSource) setColorSource(fx.colorSource as ColorSource);

      // If migrating from old Time Mode, force settings
      if (data.backgroundMode as any === 'time') {
        setEffectType('Solid');
        setColorSource('Time of Day');
      }

      if (typeof fx.speed === "number") setEffectSpeed(fx.speed);
      if (fx.baseColor) setBaseColor(fx.baseColor);
    } catch (error) {
      console.error("[BackgroundCard] Failed to load state", error);
    } finally {
      setIsLoadingState(false);
    }
  };

  const fetchGradients = async () => {
    try {
      const data = await apiClient.get<GradientResponse[]>("/time-gradients");
      setGradients(data.map(normalizeGradient));
    } catch (error) {
      console.error("[BackgroundCard] Failed to load gradients", error);
    } finally {
      setIsLoadingGradients(false);
    }
  };

  useEffect(() => {
    fetchState();
    fetchGradients();
  }, []);

  const persistState = async (partial: Record<string, unknown>) => {
    // Always ensure we are saving the full effect object to avoid partial overwrites
    const currentEffectSettings = {
      effectType,
      colorSource,
      baseColor,
      speed: effectSpeed
    };

    // If partial contains effectSettings, merge it
    const mergedSettings = { ...currentEffectSettings, ...(partial.effectSettings as object) };

    try {
      await apiClient.post("/api/godmode/state", {
        ...partial,
        effectSettings: mergedSettings
      });
    } catch (error) {
      console.error("[BackgroundCard] Failed to update state", error);
    }
  };

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    persistState({ backgroundMode: newMode });
  };

  const handleEffectTypeChange = (value: EffectType) => {
    setEffectType(value);
    persistState({ effectSettings: { effectType: value } });
  };

  const handleColorSourceChange = (value: ColorSource) => {
    setColorSource(value);
    persistState({ effectSettings: { colorSource: value } });
  };

  const handleEffectSpeedChange = (value?: number | null) => {
    const nextSpeed = typeof value === "number" ? value : effectSpeed;
    setEffectSpeed(nextSpeed);
    persistState({ effectSettings: { speed: nextSpeed } });
  };

  const handleBaseColorChange = (color: string) => {
    setBaseColor(color);
    persistState({ effectSettings: { baseColor: color } });
  };

  const handleAddGradient = () => {
    setEditingGradient(null);
    setIsModalOpen(true);
  };

  const handleEditGradient = (gradient: GradientResponse) => {
    setEditingGradient({
      id: gradient.id,
      startTime: gradient.startTime || "09:00",
      endTime: gradient.endTime || "17:00",
      startRgb: gradient.startRgb || "#000000",
      endRgb: gradient.endRgb || "#000000"
    });
    setIsModalOpen(true);
  };

  const handleSaveGradient = async (data: GradientData) => {
    try {
      let updatedGradients = [...gradients];

      // Convert to snake_case for backend
      const payload = {
        start_time: data.startTime,
        end_time: data.endTime,
        start_rgb: data.startRgb,
        end_rgb: data.endRgb
      };

      if (data.id) {
        // Update existing
        await apiClient.put(`/time-gradients/${data.id}`, payload);
        updatedGradients = updatedGradients.map(g =>
          g.id === data.id ? { ...g, ...data } : g
        );
      } else {
        // Create new
        const newGradient = await apiClient.post<GradientResponse>("/time-gradients", payload);
        updatedGradients.push(normalizeGradient(newGradient));
      }

      // Sort chronologically
      updatedGradients.sort((a, b) => {
        const timeA = a.startTime || "00:00";
        const timeB = b.startTime || "00:00";
        return timeA.localeCompare(timeB);
      });

      setGradients(updatedGradients);
    } catch (error) {
      console.error("Failed to save gradient", error);
    }
  };

  // --- Helper: Convert 24h "HH:MM" to 12h "h:MM AM/PM" ---
  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":");
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    const formattedHour = h % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  const isGradientActive = (gradient: GradientResponse) => {
    if (!gradient.startTime || !gradient.endTime) return false;

    const parseTime = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return (h * 60 + m) / (24 * 60);
    };

    const start = parseTime(gradient.startTime);
    const end = parseTime(gradient.endTime);
    const current = timeOfDay;

    // Handle wrapping (e.g. 23:00 to 02:00)
    if (start <= end) {
      return current >= start && current < end;
    } else {
      return current >= start || current < end;
    }
  };

  const renderGradientsList = () => (
    <IonList inset style={{ marginTop: '16px' }}>
      <IonListHeader>
        <IonLabel>Time of Day Schedule</IonLabel>
      </IonListHeader>

      {isLoadingGradients && (
        <IonItem lines="none">
          <IonText color="medium">Loading gradients…</IonText>
        </IonItem>
      )}

      {!isLoadingGradients &&
        gradients.map((gradient) => {
          const isActive = isGradientActive(gradient);
          const activeBorderStyle = isActive ? {
            border: '2px solid var(--ion-color-primary)',
            borderRadius: '8px',
            backgroundColor: 'rgba(var(--ion-color-primary-rgb), 0.05)'
          } : {};

          return (
            <IonItem key={gradient.id} className="gradient-item" style={activeBorderStyle}>
              <div style={{ minWidth: "90px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <IonText color={isActive ? "primary" : "dark"} style={{ fontWeight: isActive ? 700 : 600, fontSize: "0.9rem" }}>
                  {formatTime(gradient.startTime || '')}
                </IonText>
                <IonText color={isActive ? "primary" : "medium"} style={{ fontSize: "0.8rem", fontWeight: isActive ? 600 : 400 }}>
                  to {formatTime(gradient.endTime || '')}
                </IonText>
              </div>

              <div
                style={{
                  flex: 1,
                  height: "24px",
                  margin: "0 16px",
                  borderRadius: "6px",
                  background: `linear-gradient(to right, ${gradient.startRgb}, ${gradient.endRgb})`,
                  boxShadow: isActive ? "0 0 8px var(--ion-color-primary)" : "inset 0 0 0 1px rgba(255,255,255,0.15)",
                  border: isActive ? "2px solid var(--ion-color-primary)" : "none"
                }}
              />

              <IonButton size="small" fill="clear" disabled={controlsDisabled} onClick={() => handleEditGradient(gradient)}>Edit</IonButton>
              <IonButton size="small" fill="clear" color="danger" disabled={controlsDisabled}>
                <IonIcon icon={trashOutline} slot="icon-only" />
              </IonButton>
            </IonItem>
          )
        })}
      <IonButton expand="block" fill="outline" className="ion-margin-top" disabled={controlsDisabled} onClick={handleAddGradient}>
        + Add New Gradient
      </IonButton>
    </IonList>
  );

  const renderEffectContent = () => (
    <>
      <IonItem>
        <IonLabel>Effect Pattern</IonLabel>
        <IonSelect
          interface="popover"
          value={effectType}
          onIonChange={(e) => handleEffectTypeChange(e.detail.value)}
          disabled={controlsDisabled}
        >
          {effectTypes.map((type) => (
            <IonSelectOption key={type} value={type}>{type}</IonSelectOption>
          ))}
        </IonSelect>
      </IonItem>

      <IonItem>
        <IonLabel>Color Source</IonLabel>
        <IonSelect
          interface="popover"
          value={colorSource}
          onIonChange={(e) => handleColorSourceChange(e.detail.value)}
          disabled={controlsDisabled}
        >
          {colorSources.map((src) => (
            <IonSelectOption key={src} value={src}>{src}</IonSelectOption>
          ))}
        </IonSelect>
      </IonItem>

      {/* Dynamic Color Controls based on Source */}
      {colorSource === "Static" && (
        <IonItem lines="none">
          <IonLabel>Base Color</IonLabel>
          <ColorPicker
            value={baseColor}
            onChange={handleBaseColorChange}
            disabled={controlsDisabled}
          />
        </IonItem>
      )}

      {/* Speed Slider (Hidden for Solid Static, but shown for Solid+Spectrum or Wave) */}
      {(effectType !== 'Solid' || colorSource === 'Spectrum') && (
        <IonItem>
          <IonLabel>Speed</IonLabel>
          <IonRange
            pin
            value={effectSpeed}
            min={1}
            max={5}
            step={1}
            onIonChange={(e) => handleEffectSpeedChange(Number(e.detail.value))}
            disabled={controlsDisabled}
          >
            <IonLabel slot="start">Slow</IonLabel>
            <IonLabel slot="end">Fast</IonLabel>
          </IonRange>
        </IonItem>
      )}

      {/* Show Gradient List only if Time of Day is selected */}
      {colorSource === "Time of Day" && renderGradientsList()}
    </>
  );

  return (
    <LayerCard
      title="Background Controller"
      description="Configure the environment layer."
      disabled={disabled}
    >
      <IonSegment
        value={mode}
        onIonChange={(event) => handleModeChange(event.detail.value as Mode)}
        disabled={controlsDisabled}
      >
        <IonSegmentButton value="none">
          <IonLabel>None</IonLabel>
        </IonSegmentButton>
        <IonSegmentButton value="effect">
          <IonLabel>Active</IonLabel> {/* Renamed from Effect to Active since it encompasses all */}
        </IonSegmentButton>
      </IonSegment>

      {mode === "none" && (
        <IonItem lines="none">
          <IonText color="medium">Background layer disabled.</IonText>
        </IonItem>
      )}

      {mode === "effect" && renderEffectContent()}

      <GradientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveGradient}
        initialGradient={editingGradient}
      />
    </LayerCard>
  );
};

export default BackgroundCard;