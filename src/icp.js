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

  // Compute bounding box of target for random point generation
  let minB = [Infinity, Infinity, Infinity];
  let maxB = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < N; i++) {
    for (let d = 0; d < 3; d++) {
      if (target[i][d] < minB[d]) minB[d] = target[i][d];
      if (target[i][d] > maxB[d]) maxB[d] = target[i][d];
    }
  }
  // Expand bounds by 50% so outliers clearly land outside the model
  const range = [maxB[0] - minB[0], maxB[1] - minB[1], maxB[2] - minB[2]];
  const center = [(minB[0] + maxB[0]) / 2, (minB[1] + maxB[1]) / 2, (minB[2] + maxB[2]) / 2];

  const corruptedTarget = target.map((pt, i) => {
    if (!outlierIndices.has(i)) return pt;
    outlierMask[i] = true;
    // Generate a completely random 3D point in expanded bounding box
    return [
      center[0] + (Math.random() - 0.5) * range[0] * 3,
      center[1] + (Math.random() - 0.5) * range[1] * 3,
      center[2] + (Math.random() - 0.5) * range[2] * 3,
    ];
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

  // Step 5: R = V * U^T, with reflection correction
  let R = matMul3(V, transpose3(U));
  if (det3(R) < 0) {
    // Flip sign of last column of V
    V[0][2] *= -1;
    V[1][2] *= -1;
    V[2][2] *= -1;
    R = matMul3(V, transpose3(U));
  }

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
    R, t, H, U, S, V, centroidP, centroidQ, error, registered
  };
}
