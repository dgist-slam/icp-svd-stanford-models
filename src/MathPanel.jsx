import katex from 'katex';
import 'katex/dist/katex.min.css';

function Tex({ math, display = false }) {
  const html = katex.renderToString(math, { displayMode: display, throwOnError: false });
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function fmt(v, digits = 4) {
  return v.toFixed(digits);
}

function matTex(M, digits = 4) {
  return `\\begin{bmatrix} ${fmt(M[0][0],digits)} & ${fmt(M[0][1],digits)} & ${fmt(M[0][2],digits)} \\\\ ${fmt(M[1][0],digits)} & ${fmt(M[1][1],digits)} & ${fmt(M[1][2],digits)} \\\\ ${fmt(M[2][0],digits)} & ${fmt(M[2][1],digits)} & ${fmt(M[2][2],digits)} \\end{bmatrix}`;
}

function vecTex(v, digits = 4) {
  return `\\begin{bmatrix} ${fmt(v[0],digits)} \\\\ ${fmt(v[1],digits)} \\\\ ${fmt(v[2],digits)} \\end{bmatrix}`;
}

function diagTex(s, digits = 4) {
  return `\\begin{bmatrix} ${fmt(s[0],digits)} & 0 & 0 \\\\ 0 & ${fmt(s[1],digits)} & 0 \\\\ 0 & 0 & ${fmt(s[2],digits)} \\end{bmatrix}`;
}

export default function MathPanel({ result, onClose }) {
  return (
    <div className="math-panel" onWheel={e => e.stopPropagation()}>
      <div className="math-header">
        <h3>SVD Registration</h3>
        <button className="btn-close" onClick={onClose}>&times;</button>
      </div>
      <div className="math-content">
      {!result ? (
        <div className="math-step">
          <p style={{ color: '#666', fontSize: 13 }}>Run registration to see the SVD math breakdown.</p>
        </div>
      ) : (() => {
        const { R, t, H, U, S, V, centroidP, centroidQ, error } = result;
        return (<>

        <div className="math-step">
          <div className="step-label">Step 1: Centroids</div>
          <Tex display math={
            `\\bar{p} = \\frac{1}{N}\\sum_{i=1}^{N} p_i = ${vecTex(centroidP)}`
          } />
          <Tex display math={
            `\\bar{q} = \\frac{1}{N}\\sum_{i=1}^{N} q_i = ${vecTex(centroidQ)}`
          } />
        </div>

        <div className="math-step">
          <div className="step-label">Step 2: Center Points</div>
          <Tex display math={`p'_i = p_i - \\bar{p}, \\quad q'_i = q_i - \\bar{q}`} />
        </div>

        <div className="math-step">
          <div className="step-label">Step 3: Cross-Covariance</div>
          <Tex display math={`H = \\sum_{i=1}^{N} p'_i \\, {q'_i}^\\top`} />
          <Tex display math={`= ${matTex(H, 2)}`} />
        </div>

        <div className="math-step">
          <div className="step-label">Step 4: SVD</div>
          <Tex display math={`H = U \\, \\Sigma \\, V^\\top`} />
          <Tex display math={`U = ${matTex(U)}`} />
          <Tex display math={`\\Sigma = ${diagTex(S, 2)}`} />
          <Tex display math={`V = ${matTex(V)}`} />
        </div>

        <div className="math-step">
          <div className="step-label">Step 5: Optimal Rotation</div>
          <Tex display math={`R^* = V \\, U^\\top = ${matTex(R)}`} />
        </div>

        <div className="math-step">
          <div className="step-label">Step 6: Optimal Translation</div>
          <Tex display math={`t^* = \\bar{q} - R^* \\bar{p} = ${vecTex(t)}`} />
        </div>

        <div className="math-step result-error">
          <div className="step-label">Registration Error (MSE)</div>
          <Tex display math={
            `E = \\frac{1}{N}\\sum_{i=1}^{N} \\|R^* p_i + t^* - q_i\\|^2 = ${error.toExponential(4)}`
          } />
        </div>

        </>);
      })()}
      </div>
    </div>
  );
}
