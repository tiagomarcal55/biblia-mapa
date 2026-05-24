import React from 'react';

export interface DateValue {
  era: 'ac' | 'dc';
  year: number;
  precision: 'year' | 'month' | 'day';
  month?: number;
  day?: number;
  uncertainty: number; // uncertainty in years
  decimalYear: number; // calculated decimal year (negative for BC, positive for AD)
  display: string;     // Portuguese formatted display string
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function makeDateValue(
  era: 'ac' | 'dc',
  year: number,
  precision: 'year' | 'month' | 'day',
  month?: number,
  day?: number,
  uncertainty: number = 0
): DateValue {
  const mVal = month ?? 1;
  const dVal = day ?? 1;
  
  // Calculate decimal year
  let decimalYear = year;
  if (precision === 'month') {
    decimalYear += (mVal - 1) / 12;
  } else if (precision === 'day') {
    decimalYear += (mVal - 1) / 12 + (dVal - 1) / 365;
  }
  
  if (era === 'ac') {
    decimalYear = -decimalYear;
  }

  // Format display string
  let display = '';
  if (precision === 'day' && day) {
    display += `${day} de `;
  }
  if ((precision === 'month' || precision === 'day') && month) {
    display += `${MONTH_NAMES[mVal - 1]} de `;
  }
  display += `${year} ${era === 'ac' ? 'a.C.' : 'd.C.'}`;

  return {
    era,
    year,
    precision,
    month,
    day,
    uncertainty,
    decimalYear,
    display
  };
}

interface SingleDatePickerProps {
  label?: string;
  value: DateValue;
  onChange: (val: DateValue) => void;
  showAdvanced?: boolean;
}

export function SingleDatePicker({ label, value, onChange, showAdvanced = false }: SingleDatePickerProps) {
  const updateField = <K extends keyof DateValue>(field: K, val: DateValue[K]) => {
    const next = { ...value, [field]: val };
    const resolved = makeDateValue(
      next.era,
      next.year,
      next.precision,
      next.month,
      next.day,
      next.uncertainty
    );
    onChange(resolved);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--border-2)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-6)' }}>
      {label && <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-sec)' }}>{label}</span>}
      
      <div style={{ display: 'flex', gap: '8px' }}>
        {/* Era */}
        <select
          value={value.era}
          onChange={e => updateField('era', e.target.value as 'ac' | 'dc')}
          style={SELECT_STYLE}
        >
          <option value="ac">a.C. (Antes de Cristo)</option>
          <option value="dc">d.C. (Depois de Cristo)</option>
        </select>

        {/* Ano */}
        <input
          type="number"
          min={1}
          max={4000}
          value={value.year}
          onChange={e => updateField('year', Math.max(1, parseInt(e.target.value, 10) || 1))}
          style={{ ...INPUT_STYLE, width: '90px' }}
        />

        {/* Precisão */}
        <select
          value={value.precision}
          onChange={e => updateField('precision', e.target.value as 'year' | 'month' | 'day')}
          style={SELECT_STYLE}
        >
          <option value="year">Apenas Ano</option>
          <option value="month">Ano e Mês</option>
        </select>
      </div>

      {(value.precision === 'month' || value.precision === 'day') && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          {/* Mês */}
          <select
            value={value.month ?? 1}
            onChange={e => updateField('month', parseInt(e.target.value, 10))}
            style={SELECT_STYLE}
          >
            {MONTH_NAMES.map((m, idx) => (
              <option key={m} value={idx + 1}>{m}</option>
            ))}
          </select>
        </div>
      )}

      {showAdvanced && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', borderTop: '1px dashed var(--border-6)', paddingTop: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Margem de erro:</span>
          <input
            type="number"
            min={0}
            value={value.uncertainty}
            onChange={e => updateField('uncertainty', Math.max(0, parseInt(e.target.value, 10) || 0))}
            style={{ ...INPUT_STYLE, width: '70px', padding: '4px 8px', fontSize: '11px' }}
          />
          <span style={{ fontSize: '11px', color: 'var(--text-dimmer)' }}>anos</span>
        </div>
      )}
    </div>
  );
}

interface RangeDatePickerProps {
  value: { start: DateValue; end: DateValue; isRange: boolean };
  onChange: (val: { start: DateValue; end: DateValue }) => void;
  showAdvanced?: boolean;
}

export function RangeDatePicker({ value, onChange, showAdvanced = false }: RangeDatePickerProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <SingleDatePicker
        label="Data de Início"
        value={value.start}
        onChange={start => onChange({ ...value, start })}
        showAdvanced={showAdvanced}
      />
      <SingleDatePicker
        label="Data de Término"
        value={value.end}
        onChange={end => onChange({ ...value, end })}
        showAdvanced={showAdvanced}
      />
    </div>
  );
}

const SELECT_STYLE: React.CSSProperties = {
  padding: '6px 10px',
  background: 'var(--border-4)',
  border: '1px solid var(--border-10)',
  borderRadius: '6px',
  color: 'var(--text-main)',
  fontSize: '12px',
  outline: 'none',
  cursor: 'pointer',
};

const INPUT_STYLE: React.CSSProperties = {
  padding: '6px 10px',
  background: 'var(--border-4)',
  border: '1px solid var(--border-10)',
  borderRadius: '6px',
  color: 'var(--text-main)',
  fontSize: '12px',
  outline: 'none',
};