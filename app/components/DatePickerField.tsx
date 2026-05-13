'use client';

import { ChangeEvent, useEffect, useState } from 'react';

interface DatePickerFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

function parseISODate(value: string) {
  const datePart = value.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.valueOf()) ? null : date;
}

function formatDDMMYYYY(value: string) {
  const date = parseISODate(value);
  if (!date) return '';
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function parseDDMMYYYY(value: string) {
  const parts = value.split('/').map(Number);
  if (parts.length !== 3) return '';
  const [day, month, year] = parts;
  if (!day || !month || !year) return '';
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCDate() !== day || date.getUTCMonth() + 1 !== month || date.getUTCFullYear() !== year) return '';
  return date.toISOString();
}

export function DatePickerField({ id, label, value, onChange, className }: DatePickerFieldProps) {
  const [inputValue, setInputValue] = useState(formatDDMMYYYY(value));

  useEffect(() => {
    setInputValue(formatDDMMYYYY(value));
  }, [value]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setInputValue(nextValue);
    const parsed = parseDDMMYYYY(nextValue);
    onChange(parsed);
  };

  return (
    <div>
      <label htmlFor={id} className="label-text mb-1.5 block">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder="dd/mm/yyyy"
        className={className ?? 'input-base'}
      />
    </div>
  );
}
