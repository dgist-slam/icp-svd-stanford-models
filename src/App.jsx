import { useState, useEffect, useCallback } from 'react';
import Viewer3D from './Viewer3D';
import ControlPanel from './ControlPanel';
import MathPanel from './MathPanel';
import { eulerToRotation, applyTransform, registerSVD, corruptCorrespondences, runICP } from './icp';
import './App.css';

const MODEL_NAMES = ['bunny', 'dragon', 'happy_buddha', 'armadillo', 'drill'];

function App() {
  const [models, setModels] = useState({});
  const [selectedModel, setSelectedModel] = useState('bunny');
  const [rotation, setRotation] = useState([0, 0, 0]);
  const [translation, setTranslation] = useState([0, 0, 0]);
  const [transformed, setTransformed] = useState(null);
  const [registered, setRegistered] = useState(null);
  const [regResult, setRegResult] = useState(null);
  const [showMath, setShowMath] = useState(false);
  const [loading, setLoading] = useState(true);
  const [outlierRatio, setOutlierRatio] = useState(0);
  const [outlierMask, setOutlierMask] = useState(null);
  const [corruptedTarget, setCorruptedTarget] = useState(null);
  const [pointSize, setPointSize] = useState(3);
  const [mode, setMode] = useState('known');       // 'known' | 'unknown'
  const [maxRange, setMaxRange] = useState(0.5);
  const [nnCorrespondences, setNnCorrespondences] = useState(null);

  useEffect(() => {
    async function loadAll() {
      const loaded = {};
      for (const name of MODEL_NAMES) {
        try {
          const res = await fetch(`${import.meta.env.BASE_URL}models/${name}.json`);
          const data = await res.json();
          loaded[name] = data.points;
        } catch (e) {
          console.error(`Failed to load ${name}:`, e);
        }
      }
      setModels(loaded);
      setLoading(false);
    }
    loadAll();
  }, []);

  useEffect(() => {
    setRegistered(null);
    setRegResult(null);
    setShowMath(false);
    setRotation([0, 0, 0]);
    setTranslation([0, 0, 0]);
    setNnCorrespondences(null);
  }, [selectedModel]);

  // Auto-compute transformed whenever rotation/translation/model changes
  useEffect(() => {
    const points = models[selectedModel];
    if (!points) { setTransformed(null); return; }
    const R = eulerToRotation(rotation[0], rotation[1], rotation[2]);
    const moved = applyTransform(points, R, translation);
    setTransformed(moved);
    setRegistered(null);
    setRegResult(null);
    setShowMath(false);
    setOutlierMask(null);
    setCorruptedTarget(null);
    setNnCorrespondences(null);
  }, [models, selectedModel, rotation, translation]);

  const handleRandom = useCallback(() => {
    const rand = (lo, hi) => lo + Math.random() * (hi - lo);
    setRotation([
      Math.round(rand(-45, 45)),
      Math.round(rand(-45, 45)),
      Math.round(rand(-45, 45)),
    ]);
    setTranslation([
      +rand(-0.5, 0.5).toFixed(2),
      +rand(-0.5, 0.5).toFixed(2),
      +rand(-0.5, 0.5).toFixed(2),
    ]);
  }, []);

  const runKnownRegistration = useCallback((ratio) => {
    if (!transformed) return;
    const original = models[selectedModel];
    const { corruptedTarget: ct, outlierMask: mask } = corruptCorrespondences(
      transformed, original, ratio / 100
    );
    const result = registerSVD(transformed, ct);
    setRegistered(result.registered);
    setRegResult(result);
    setOutlierMask(mask);
    setCorruptedTarget(ct);
    setNnCorrespondences(null);
    setShowMath(true);
  }, [models, selectedModel, transformed]);

  const runUnknownRegistration = useCallback(() => {
    if (!transformed) return;
    const original = models[selectedModel];
    const icpResult = runICP(transformed, original, maxRange);
    setRegistered(icpResult.registered);
    setRegResult(icpResult.result);
    setOutlierMask(null);
    setCorruptedTarget(null);
    setNnCorrespondences(icpResult.correspondences);
    setShowMath(true);
  }, [models, selectedModel, transformed, maxRange]);

  // Auto-run registration when parameters change
  useEffect(() => {
    if (transformed && mode === 'known') runKnownRegistration(outlierRatio);
  }, [outlierRatio]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (transformed && mode === 'unknown') runUnknownRegistration();
  }, [maxRange]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Loading point cloud models...
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>ICP Registration Demo <span className="subtitle">SVD-based Point Cloud Alignment</span></h1>
      </header>

      <div className="main-layout">
        {showMath && (
          <MathPanel result={regResult} onClose={() => setShowMath(false)} />
        )}

        <div className="viewer-container">
          <Viewer3D
            original={models[selectedModel]}
            transformed={transformed}
            registered={registered}
            outlierMask={outlierMask}
            corruptedTarget={corruptedTarget}
            pointSize={pointSize}
            mode={mode}
            nnCorrespondences={nnCorrespondences}
          />
          {models[selectedModel] && (
            <div className="point-count">
              {models[selectedModel].length} points
            </div>
          )}
        </div>

        <ControlPanel
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          rotation={rotation}
          translation={translation}
          onRotationChange={setRotation}
          onTranslationChange={setTranslation}
          onRandom={handleRandom}
          outlierRatio={outlierRatio}
          onOutlierRatioChange={setOutlierRatio}
          pointSize={pointSize}
          onPointSizeChange={setPointSize}
          mode={mode}
          onModeChange={setMode}
          maxRange={maxRange}
          onMaxRangeChange={setMaxRange}
        />
      </div>
    </div>
  );
}

export default App;
