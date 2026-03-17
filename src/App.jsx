import { useState, useEffect, useCallback } from 'react';
import Viewer3D from './Viewer3D';
import ControlPanel from './ControlPanel';
import MathPanel from './MathPanel';
import { eulerToRotation, applyTransform, registerSVD, corruptCorrespondences } from './icp';
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
    setTransformed(null);
    setRegistered(null);
    setRegResult(null);
    setShowMath(false);
    setRotation([0, 0, 0]);
    setTranslation([0, 0, 0]);
  }, [selectedModel]);

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

  const handleApply = useCallback(() => {
    const points = models[selectedModel];
    if (!points) return;
    const R = eulerToRotation(rotation[0], rotation[1], rotation[2]);
    const t = translation;
    const moved = applyTransform(points, R, t);
    setTransformed(moved);
    setRegistered(null);
    setRegResult(null);
    setShowMath(false);
    setOutlierMask(null);
  }, [models, selectedModel, rotation, translation]);

  const handleRegister = useCallback(() => {
    if (!transformed) return;
    const original = models[selectedModel];
    const { corruptedTarget, outlierMask: mask } = corruptCorrespondences(
      transformed, original, outlierRatio / 100
    );
    const result = registerSVD(transformed, corruptedTarget);
    setRegistered(result.registered);
    setRegResult(result);
    setOutlierMask(mask);
    setShowMath(true);
  }, [models, selectedModel, transformed, outlierRatio]);

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
          onApply={handleApply}
          onRandom={handleRandom}
          onRegister={handleRegister}
          hasTransformed={!!transformed}
          outlierRatio={outlierRatio}
          onOutlierRatioChange={setOutlierRatio}
        />
      </div>
    </div>
  );
}

export default App;
