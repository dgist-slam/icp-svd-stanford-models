import { useState } from 'react';

const MODEL_OPTIONS = [
  { value: 'bunny', label: 'Stanford Bunny' },
  { value: 'dragon', label: 'Dragon' },
  { value: 'happy_buddha', label: 'Happy Buddha' },
  { value: 'armadillo', label: 'Armadillo' },
  { value: 'drill', label: 'Drill Bit' },
];

function SliderRow({ label, value, onChange, min, max, step }) {
  return (
    <div className="slider-row">
      <label>{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={+value.toFixed(step < 1 ? 2 : 0)}
        onChange={e => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        className="num-input"
      />
    </div>
  );
}

export default function ControlPanel({
  selectedModel, onModelChange,
  rotation, translation,
  onRotationChange, onTranslationChange,
  onApply, onRandom, onRegister,
  hasTransformed,
  outlierRatio, onOutlierRatioChange,
}) {
  const setR = (idx, val) => {
    const r = [...rotation];
    r[idx] = val;
    onRotationChange(r);
  };
  const setT = (idx, val) => {
    const t = [...translation];
    t[idx] = val;
    onTranslationChange(t);
  };

  return (
    <div className="control-panel" onWheel={e => e.stopPropagation()}>
      <div className="section">
        <h3>Model</h3>
        <select
          value={selectedModel}
          onChange={e => onModelChange(e.target.value)}
        >
          {MODEL_OPTIONS.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <div className="section">
        <h3>Rotation (deg)</h3>
        <SliderRow label="Rx" value={rotation[0]} onChange={v => setR(0, v)} min={-180} max={180} step={1} />
        <SliderRow label="Ry" value={rotation[1]} onChange={v => setR(1, v)} min={-180} max={180} step={1} />
        <SliderRow label="Rz" value={rotation[2]} onChange={v => setR(2, v)} min={-180} max={180} step={1} />
      </div>

      <div className="section">
        <h3>Translation</h3>
        <SliderRow label="tx" value={translation[0]} onChange={v => setT(0, v)} min={-1} max={1} step={0.01} />
        <SliderRow label="ty" value={translation[1]} onChange={v => setT(1, v)} min={-1} max={1} step={0.01} />
        <SliderRow label="tz" value={translation[2]} onChange={v => setT(2, v)} min={-1} max={1} step={0.01} />
      </div>

      <div className="section">
        <h3>Outliers</h3>
        <SliderRow label="%" value={outlierRatio} onChange={onOutlierRatioChange} min={0} max={80} step={1} />
      </div>

      <div className="section buttons">
        <button className="btn btn-random" onClick={onRandom}>
          Random R, t
        </button>
        <button className="btn btn-apply" onClick={onApply}>
          Apply Transform
        </button>
        <button
          className="btn btn-register"
          onClick={onRegister}
          disabled={!hasTransformed}
        >
          Register (SVD)
        </button>
      </div>

      <div className="section legend">
        <h3>Legend</h3>
        <div className="legend-item"><span className="dot green" /> Original (Target)</div>
        <div className="legend-item"><span className="dot red" /> Transformed (Source)</div>
        <div className="legend-item"><span className="dot blue" /> Registered (Result)</div>
        <div className="legend-item"><span className="line gray" /> Correspondences</div>
        <div className="legend-item"><span className="line orange" /> False Correspondences</div>
      </div>
    </div>
  );
}
