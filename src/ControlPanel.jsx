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
  onRandom,
  outlierRatio, onOutlierRatioChange,
  pointSize, onPointSizeChange,
  mode, onModeChange,
  maxRange, onMaxRangeChange,
  onRunICP, onICPStep, icpIter, icpRunning,
  hasTransformed,
  maxIter, onMaxIterChange,
  convThreshExp, onConvThreshExpChange,
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
        <h3>Mode</h3>
        <div className="mode-toggle">
          <button
            className={`mode-btn ${mode === 'known' ? 'active' : ''}`}
            onClick={() => onModeChange('known')}
          >
            Known Corr.
          </button>
          <button
            className={`mode-btn ${mode === 'unknown' ? 'active' : ''}`}
            onClick={() => onModeChange('unknown')}
          >
            Unknown Corr.
          </button>
        </div>
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

      {mode === 'known' ? (
        <div className="section">
          <h3>Outliers</h3>
          <SliderRow label="%" value={outlierRatio} onChange={onOutlierRatioChange} min={0} max={99} step={1} />
        </div>
      ) : (
        <div className="section">
          <h3>ICP Parameters</h3>
          <SliderRow label="r" value={maxRange} onChange={onMaxRangeChange} min={0.01} max={2.0} step={0.01} />
          <SliderRow label="N" value={maxIter} onChange={onMaxIterChange} min={1} max={100} step={1} />
          <div className="slider-row">
            <label>thr</label>
            <input type="range" min={2} max={8} step={1} value={convThreshExp}
              onChange={e => onConvThreshExpChange(parseInt(e.target.value))} />
            <span className="thresh-label">1e-{convThreshExp}</span>
          </div>
        </div>
      )}

      <div className="section">
        <h3>Point Size</h3>
        <SliderRow label="px" value={pointSize} onChange={onPointSizeChange} min={1} max={10} step={1} />
      </div>

      <div className="section buttons">
        <button className="btn btn-random" onClick={onRandom}>
          Random R, t (Reset)
        </button>
        {mode === 'unknown' && (
          <>
            <button className={`btn ${icpRunning ? 'btn-stop' : 'btn-register'}`} onClick={onRunICP} disabled={!hasTransformed}>
              {icpRunning ? 'Stop ICP' : 'Run ICP'}
            </button>
            <button className="btn btn-step" onClick={onICPStep} disabled={!hasTransformed || icpRunning}>
              +1 Iteration {icpIter > 0 && `(${icpIter})`}
            </button>
          </>
        )}
      </div>

      <div className="section legend">
        <h3>Legend</h3>
        <div className="legend-item"><span className="dot green" /> Original (Target)</div>
        <div className="legend-item"><span className="dot magenta" /> Transformed (Source)</div>
        <div className="legend-item"><span className="dot blue" /> Registered (Result)</div>
        {mode === 'known' ? (
          <>
            <div className="legend-item"><span className="line green" /> True Correspondences</div>
            <div className="legend-item"><span className="line red" /> False Correspondences</div>
          </>
        ) : (
          <div className="legend-item"><span className="line gray" /> NN Correspondences</div>
        )}
      </div>
    </div>
  );
}
