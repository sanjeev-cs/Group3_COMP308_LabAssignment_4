import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';

const BeaconCore = ({ intensity, tint }) => {
  const coreReference = useRef(null);
  const innerRingReference = useRef(null);
  const outerRingReference = useRef(null);
  const baseReference = useRef(null);

  useFrame((_state, delta) => {
    if (coreReference.current) {
      coreReference.current.rotation.x += delta * 0.32;
      coreReference.current.rotation.y += delta * 0.58;
    }

    if (innerRingReference.current) {
      innerRingReference.current.rotation.x += delta * 0.28;
      innerRingReference.current.rotation.z += delta * 0.34;
    }

    if (outerRingReference.current) {
      outerRingReference.current.rotation.y -= delta * 0.24;
      outerRingReference.current.rotation.z += delta * 0.18;
    }

    if (baseReference.current) {
      baseReference.current.rotation.z += delta * 0.1;
    }
  });

  const emissiveStrength = 0.45 + intensity * 0.85;
  const ringScale = 1 + intensity * 0.08;

  return (
    <group scale={0.96}>
      <mesh ref={baseReference} position={[0, -0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.1, 1.56, 80]} />
        <meshStandardMaterial
          color="#12253d"
          emissive={tint}
          emissiveIntensity={0.14 + intensity * 0.15}
          opacity={0.92}
          roughness={0.4}
          transparent
        />
      </mesh>

      <mesh ref={outerRingReference} scale={ringScale}>
        <torusGeometry args={[1.18, 0.06, 18, 96]} />
        <meshStandardMaterial
          color={tint}
          emissive={tint}
          emissiveIntensity={emissiveStrength}
          metalness={0.3}
          roughness={0.16}
          transparent
          opacity={0.9}
        />
      </mesh>

      <mesh ref={innerRingReference} rotation={[0.9, 0.38, 0.44]} scale={0.84 + intensity * 0.08}>
        <torusGeometry args={[0.82, 0.05, 18, 84]} />
        <meshStandardMaterial
          color="#d7f4ff"
          emissive={tint}
          emissiveIntensity={0.36 + intensity * 0.7}
          metalness={0.2}
          roughness={0.2}
        />
      </mesh>

      <mesh ref={coreReference}>
        <octahedronGeometry args={[0.54, 1]} />
        <meshStandardMaterial
          color="#f4fbff"
          emissive={tint}
          emissiveIntensity={0.72 + intensity * 1.2}
          metalness={0.46}
          roughness={0.08}
        />
      </mesh>
    </group>
  );
};

const SignalBeacon = ({ className = '', intensity = 0.45, tint = '#8edcff' }) => {
  const clampedIntensity = useMemo(() => Math.max(0.18, Math.min(intensity, 1)), [intensity]);

  return (
    <div className={`signal-beacon ${className}`.trim()}>
      <Canvas camera={{ fov: 34, position: [0, 0.25, 4.8] }} dpr={[1, 1.4]}>
        <ambientLight intensity={0.85} />
        <pointLight color={tint} intensity={10} position={[2.6, 1.8, 2.8]} />
        <pointLight color="#dff7ff" intensity={3.6} position={[-2.8, -1.4, 2.4]} />
        <BeaconCore intensity={clampedIntensity} tint={tint} />
      </Canvas>
    </div>
  );
};

export default SignalBeacon;
