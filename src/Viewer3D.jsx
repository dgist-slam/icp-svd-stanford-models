import { useMemo, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';

function PointCloud({ points, color, size = 3 }) {
  const ref = useRef();

  const positions = useMemo(() => {
    if (!points) return null;
    const arr = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      arr[i * 3] = points[i][0];
      arr[i * 3 + 1] = points[i][1];
      arr[i * 3 + 2] = points[i][2];
    }
    return arr;
  }, [points]);

  useEffect(() => {
    if (ref.current) {
      ref.current.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      ref.current.attributes.position.needsUpdate = true;
      ref.current.computeBoundingSphere();
    }
  }, [positions]);

  if (!positions) return null;

  return (
    <points>
      <bufferGeometry ref={ref}>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={points.length}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={size}
        sizeAttenuation={false}
        depthWrite={false}
        transparent
        opacity={0.9}
      />
    </points>
  );
}

function CorrespondenceLines({ source, target }) {
  const geometry = useMemo(() => {
    if (!source || !target) return null;
    const n = Math.min(source.length, target.length);
    const positions = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) {
      positions[i * 6] = source[i][0];
      positions[i * 6 + 1] = source[i][1];
      positions[i * 6 + 2] = source[i][2];
      positions[i * 6 + 3] = target[i][0];
      positions[i * 6 + 4] = target[i][1];
      positions[i * 6 + 5] = target[i][2];
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geom;
  }, [source, target]);

  if (!geometry) return null;

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#aaaaaa" transparent opacity={0.15} depthWrite={false} />
    </lineSegments>
  );
}

export default function Viewer3D({ original, transformed, registered }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 3], fov: 50, near: 0.01, far: 100 }}
      style={{ background: '#1a1a2e' }}
    >
      <ambientLight intensity={0.5} />

      {/* Original = green */}
      <PointCloud points={original} color="#00ee77" size={3} />

      {/* Transformed = red */}
      <PointCloud points={transformed} color="#ff4455" size={3} />

      {/* Registered = blue */}
      <PointCloud points={registered} color="#44aaff" size={4} />

      {/* Correspondence lines: from transformed (red) to original (green) */}
      {transformed && <CorrespondenceLines source={transformed} target={original} />}

      <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport labelColor="white" axisHeadScale={0.8} />
      </GizmoHelper>

      <gridHelper args={[4, 20, '#333355', '#222244']} rotation={[0, 0, 0]} />
      <axesHelper args={[1.5]} />
    </Canvas>
  );
}
