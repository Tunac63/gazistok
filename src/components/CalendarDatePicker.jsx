import React from "react";

export default function CalendarDatePicker({ value, onChange, min, max }) {
  return (
    <input
      type="date"
      className="form-control"
      value={value}
      onChange={e => onChange(e.target.value)}
      min={min}
      max={max}
      style={{ maxWidth: 180 }}
    />
  );
}
