// ============================================================
// 3x3 Matrix utilities and SVD-based Point Cloud Registration
// ============================================================

// --- Basic 3x3 matrix operations ---

export function mat3(a00,a01,a02, a10,a11,a12, a20,a21,a22) {
  return [[a00,a01,a02],[a10,a11,a12],[a20,a21,a22]];
}

export function zeros3() { return [[0,0,0],[0,0,0],[0,0,0]]; }
export function eye3() { return [[1,0,0],[0,1,0],[0,0,1]]; }

export function transpose3(A) {
  return [
    [A[0][0], A[1][0], A[2][0]],
    [A[0][1], A[1][1], A[2][1]],
    [A[0][2], A[1][2], A[2][2]]
  ];
}

export function matMul3(A, B) {
  const C = zeros3();
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++)
        C[i][j] += A[i][k] * B[k][j];
  return C;
}

export function matVec3(A, v) {
  return [
    A[0][0]*v[0] + A[0][1]*v[1] + A[0][2]*v[2],
    A[1][0]*v[0] + A[1][1]*v[1] + A[1][2]*v[2],
    A[2][0]*v[0] + A[2][1]*v[1] + A[2][2]*v[2]
  ];
}

export function det3(A) {
  return (
    A[0][0]*(A[1][1]*A[2][2] - A[1][2]*A[2][1]) -
    A[0][1]*(A[1][0]*A[2][2] - A[1][2]*A[2][0]) +
    A[0][2]*(A[1][0]*A[2][1] - A[1][1]*A[2][0])
  );
}

export function copyMat3(A) {
  return A.map(row => [...row]);
}

// --- Euler angles (degrees) to rotation matrix ---
// Convention: Rz * Ry * Rx (extrinsic XYZ)
export function eulerToRotation(rx, ry, rz) {
  const toRad = d => d * Math.PI / 180;
  const cx = Math.cos(toRad(rx)), sx = Math.sin(toRad(rx));
  const cy = Math.cos(toRad(ry)), sy = Math.sin(toRad(ry));
  const cz = Math.cos(toRad(rz)), sz = Math.sin(toRad(rz));

  return [
    [cy*cz, sx*sy*cz - cx*sz, cx*sy*cz + sx*sz],
    [cy*sz, sx*sy*sz + cx*cz, cx*sy*sz - sx*cz],
    [-sy,   sx*cy,            cx*cy           ]
  ];
}

// --- Apply rigid transform: q = R*p + t ---
export function applyTransform(points, R, t) {
  return points.map(p => {
    const rp = matVec3(R, p);
    return [rp[0]+t[0], rp[1]+t[1], rp[2]+t[2]];
  });
}

// --- Jacobi SVD for 3x3 matrices ---
// Computes A = U * diag(S) * V^T

function jacobiRotation(A, p, q) {
  // Givens rotation to zero out A[p][q] in A^T*A
  const app = A[0][p]*A[0][p] + A[1][p]*A[1][p] + A[2][p]*A[2][p];
  const aqq = A[0][q]*A[0][q] + A[1][q]*A[1][q] + A[2][q]*A[2][q];
  const apq = A[0][p]*A[0][q] + A[1][p]*A[1][q] + A[2][p]*A[2][q];

  if (Math.abs(apq) < 1e-15) return null;

  const tau = (aqq - app) / (2 * apq);
  const t = Math.sign(tau) / (Math.abs(tau) + Math.sqrt(1 + tau*tau));
  const c = 1 / Math.sqrt(1 + t*t);
  const s = t * c;
  return { c, s, p, q };
}

export function svd3x3(A_in) {
  // Work on a copy
  const A = A_in.map(r => [...r]);
  const V = eye3();

  // Jacobi iterations on columns of A
  for (let iter = 0; iter < 100; iter++) {
    let maxOff = 0;
    // Check off-diagonal of A^T*A
    for (let p = 0; p < 3; p++) {
      for (let q = p+1; q < 3; q++) {
        const apq = A[0][p]*A[0][q] + A[1][p]*A[1][q] + A[2][p]*A[2][q];
        maxOff = Math.max(maxOff, Math.abs(apq));
      }
    }
    if (maxOff < 1e-12) break;

    for (let p = 0; p < 3; p++) {
      for (let q = p+1; q < 3; q++) {
        const rot = jacobiRotation(A, p, q);
        if (!rot) continue;
        const { c, s } = rot;

        // Apply rotation to columns p,q of A
        for (let i = 0; i < 3; i++) {
          const aip = A[i][p], aiq = A[i][q];
          A[i][p] = c*aip - s*aiq;
          A[i][q] = s*aip + c*aiq;
        }
        // Accumulate V
        for (let i = 0; i < 3; i++) {
          const vip = V[i][p], viq = V[i][q];
          V[i][p] = c*vip - s*viq;
          V[i][q] = s*vip + c*viq;
        }
      }
    }
  }

  // Now A = U * diag(sigma). Columns of A are U*sigma.
  const sigma = [0, 0, 0];
  const U = eye3();
  for (let j = 0; j < 3; j++) {
    sigma[j] = Math.sqrt(A[0][j]*A[0][j] + A[1][j]*A[1][j] + A[2][j]*A[2][j]);
    if (sigma[j] > 1e-15) {
      U[0][j] = A[0][j] / sigma[j];
      U[1][j] = A[1][j] / sigma[j];
      U[2][j] = A[2][j] / sigma[j];
    }
  }

  // Sort singular values descending
  const order = [0, 1, 2].sort((a, b) => sigma[b] - sigma[a]);
  const S = order.map(i => sigma[i]);
  const Usorted = zeros3();
  const Vsorted = zeros3();
  for (let j = 0; j < 3; j++) {
    for (let i = 0; i < 3; i++) {
      Usorted[i][j] = U[i][order[j]];
      Vsorted[i][j] = V[i][order[j]];
    }
  }

  return { U: Usorted, S, V: Vsorted };
}

// --- Corrupt correspondences (introduce false matches) ---
// Maps outlier source points to biased actual target points (not random 3D coords).
// A random direction axis is chosen; target points sorted along it; outliers
// are re-assigned to points from the opposite end, creating asymmetric error
// that properly breaks SVD registration.
export function corruptCorrespondences(source, target, ratio) {
  const N = source.length;
  const numOutliers = Math.round(N * ratio);
  const outlierMask = new Array(N).fill(false);

  if (numOutliers === 0) return { corruptedTarget: target, outlierMask };

  // Pick random indices to corrupt
  const indices = Array.from({ length: N }, (_, i) => i);
  for (let i = N - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const outlierIndices = new Set(indices.slice(0, numOutliers));

  // Random bias direction (unit vector)
  let dx = Math.random() - 0.5, dy = Math.random() - 0.5, dz = Math.random() - 0.5;
  const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
  dx /= len; dy /= len; dz /= len;

  // Sort target indices by projection onto bias direction
  const projections = target.map((p, i) => ({
    i, proj: p[0]*dx + p[1]*dy + p[2]*dz
  }));
  projections.sort((a, b) => a.proj - b.proj);

  // For each outlier, assign a target point from the opposite end
  // (high-proj source → low-proj target, and vice versa)
  const outlierSrcIndices = [];
  for (let i = 0; i < N; i++) {
    if (outlierIndices.has(i)) outlierSrcIndices.push(i);
  }
  // Sort outlier source indices by their projection (ascending)
  outlierSrcIndices.sort((a, b) =>
    (source[a][0]*dx + source[a][1]*dy + source[a][2]*dz) -
    (source[b][0]*dx + source[b][1]*dy + source[b][2]*dz)
  );
  // Pick target points from the opposite end of the sorted list
  const farTargetIndices = projections.slice(-numOutliers).reverse().map(p => p.i);

  const reassignMap = new Map();
  for (let k = 0; k < outlierSrcIndices.length; k++) {
    reassignMap.set(outlierSrcIndices[k], farTargetIndices[k]);
  }

  const corruptedTarget = target.map((pt, i) => {
    if (!outlierIndices.has(i)) return pt;
    outlierMask[i] = true;
    return target[reassignMap.get(i)];
  });

  return { corruptedTarget, outlierMask };
}

// --- SVD-based point cloud registration ---
// Given source P and target Q with known correspondences (P[i] <-> Q[i]),
// find R, t such that R*P[i] + t ≈ Q[i]
export function registerSVD(source, target) {
  const N = source.length;

  // Step 1: Compute centroids
  const centroidP = [0, 0, 0];
  const centroidQ = [0, 0, 0];
  for (let i = 0; i < N; i++) {
    for (let d = 0; d < 3; d++) {
      centroidP[d] += source[i][d];
      centroidQ[d] += target[i][d];
    }
  }
  for (let d = 0; d < 3; d++) {
    centroidP[d] /= N;
    centroidQ[d] /= N;
  }

  // Step 2: Center the points
  const P = source.map(p => [p[0]-centroidP[0], p[1]-centroidP[1], p[2]-centroidP[2]]);
  const Q = target.map(q => [q[0]-centroidQ[0], q[1]-centroidQ[1], q[2]-centroidQ[2]]);

  // Step 3: Compute cross-covariance H = sum(P_i * Q_i^T)
  const H = zeros3();
  for (let i = 0; i < N; i++) {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        H[r][c] += P[i][r] * Q[i][c];
      }
    }
  }

  // Step 4: SVD of H
  const { U, S, V } = svd3x3(H);

  // Step 5: R = V * W* * U^T, where W* = diag(1, 1, det(VU^T))
  const detVU = det3(matMul3(V, transpose3(U)));
  const W = [[1,0,0],[0,1,0],[0,0, detVU > 0 ? 1 : -1]];
  const R = matMul3(matMul3(V, W), transpose3(U));

  // Step 6: t = centroidQ - R * centroidP
  const RcP = matVec3(R, centroidP);
  const t = [centroidQ[0] - RcP[0], centroidQ[1] - RcP[1], centroidQ[2] - RcP[2]];

  // Compute registration error
  const registered = applyTransform(source, R, t);
  let error = 0;
  for (let i = 0; i < N; i++) {
    const dx = registered[i][0] - target[i][0];
    const dy = registered[i][1] - target[i][1];
    const dz = registered[i][2] - target[i][2];
    error += dx*dx + dy*dy + dz*dz;
  }
  error /= N;

  return {
    R, t, H, U, S, V, W, centroidP, centroidQ, error, registered
  };
}

// --- NN-based correspondence finding ---
// For each source point, find the nearest target point within maxRange.
// Returns only matched pairs (unmatched source points are skipped).
export function findNNCorrespondences(source, target, maxRange) {
  const maxR2 = maxRange * maxRange;
  const srcPairs = [];
  const tgtPairs = [];
  for (let i = 0; i < source.length; i++) {
    let bestDist2 = Infinity;
    let bestJ = -1;
    for (let j = 0; j < target.length; j++) {
      const dx = source[i][0] - target[j][0];
      const dy = source[i][1] - target[j][1];
      const dz = source[i][2] - target[j][2];
      const d2 = dx*dx + dy*dy + dz*dz;
      if (d2 < bestDist2) { bestDist2 = d2; bestJ = j; }
    }
    if (bestDist2 <= maxR2 && bestJ >= 0) {
      srcPairs.push(source[i]);
      tgtPairs.push(target[bestJ]);
    }
  }
  return { srcPairs, tgtPairs };
}

// --- Single ICP iteration ---
// Takes current source positions, finds NN, registers, returns updated positions.
export function icpStep(current, target, maxRange) {
  const { srcPairs, tgtPairs } = findNNCorrespondences(current, target, maxRange);
  if (srcPairs.length < 3) return null;

  const result = registerSVD(srcPairs, tgtPairs);
  const updated = applyTransform(current, result.R, result.t);
  const correspondences = findNNCorrespondences(updated, target, maxRange);

  // Compute MSE
  let error = 0;
  for (let i = 0; i < updated.length; i++) {
    let bestDist2 = Infinity;
    for (let j = 0; j < target.length; j++) {
      const dx = updated[i][0] - target[j][0];
      const dy = updated[i][1] - target[j][1];
      const dz = updated[i][2] - target[j][2];
      const d2 = dx*dx + dy*dy + dz*dz;
      if (d2 < bestDist2) bestDist2 = d2;
    }
    error += bestDist2;
  }
  error /= updated.length;

  return {
    registered: updated,
    result,
    error,
    correspondences,
    numCorrespondences: correspondences.srcPairs.length,
  };
}

// --- Iterative Closest Point (unknown correspondences) ---
export function runICP(source, target, maxRange, maxIter = 30) {
  let current = source;
  let lastError = Infinity;
  let result = null;
  let correspondences = null;

  for (let iter = 0; iter < maxIter; iter++) {
    // Find NN correspondences
    const { srcPairs, tgtPairs } = findNNCorrespondences(current, target, maxRange);
    if (srcPairs.length < 3) break; // Not enough correspondences

    // SVD registration
    result = registerSVD(srcPairs, tgtPairs);

    // Apply transform to ALL source points (not just matched ones)
    current = applyTransform(current, result.R, result.t);
    correspondences = { srcPairs: [...current.slice(0, srcPairs.length)], tgtPairs };

    // Convergence check
    if (Math.abs(lastError - result.error) < 1e-8) break;
    lastError = result.error;
  }

  // Final correspondences for visualization
  const finalCorr = findNNCorrespondences(current, target, maxRange);

  // Compute final MSE against target (using original source)
  let finalError = 0;
  for (let i = 0; i < current.length; i++) {
    // Find NN for error computation
    let bestDist2 = Infinity;
    for (let j = 0; j < target.length; j++) {
      const dx = current[i][0] - target[j][0];
      const dy = current[i][1] - target[j][1];
      const dz = current[i][2] - target[j][2];
      const d2 = dx*dx + dy*dy + dz*dz;
      if (d2 < bestDist2) bestDist2 = d2;
    }
    finalError += bestDist2;
  }
  finalError /= current.length;

  return {
    registered: current,
    result, // last SVD result (for math panel)
    error: finalError,
    correspondences: finalCorr,
    numCorrespondences: finalCorr.srcPairs.length,
  };
}
