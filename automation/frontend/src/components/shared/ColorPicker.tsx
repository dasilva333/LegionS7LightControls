import React from 'react';
import './ColorPicker.css';

export type ColorPickerProps = {
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
};

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, disabled }) => (
  <label className="color-picker">
    <input
      type="color"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    />
    <span>{value.toUpperCase()}</span>
  </label>
);

export default ColorPicker;
