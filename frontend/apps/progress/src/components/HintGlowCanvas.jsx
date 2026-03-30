import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Float } from '@react-three/drei';
import { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_COLORS = {
  tip: '#4ade80',
  warning: '#ff6b6b',
  strategy: '#60a5fa',
};

// ─── Animated Particles ──────────────────────────────────────────────────────

const GlowParticles = ({ color, count = 40 }) => {
  const meshRef = useRef(null);

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
      speeds[i] = 0.2 + Math.random() * 0.6;
    }

    return { positions, speeds };
  }, [count]);

  useFrame((_state, delta) => {
    if (!meshRef.current) return;
    const posArray = meshRef.current.geometry.attributes.position.array;

    for (let i = 0; i < count; i++) {
      posArray[i * 3 + 1] += particles.speeds[i] * delta;

      // Reset particles that float off-screen
      if (posArray[i * 3 + 1] > 2.5) {
        posArray[i * 3 + 1] = -2.5;
        posArray[i * 3] = (Math.random() - 0.5) * 8;
      }
    }

    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={particles.positions}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.04}
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
};

// ─── Glowing Text Mesh ───────────────────────────────────────────────────────

const GlowText = ({ text, color }) => {
  const [opacity, setOpacity] = useState(0);
  const materialRef = useRef(null);

  // Fade-in animation when text changes
  useEffect(() => {
    setOpacity(0);
    const timer = setTimeout(() => setOpacity(1), 100);
    return () => clearTimeout(timer);
  }, [text]);

  // Emissive pulsing effect
  useFrame((state) => {
    if (!materialRef.current) return;
    const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.3 + 1.5;
    materialRef.current.emissiveIntensity = pulse;
  });

  // Truncate long hints for readable 3D display
  const displayText = text.length > 100 ? text.substring(0, 100) + '...' : text;

  return (
    <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.4}>
      <Text
        fontSize={0.2}
        maxWidth={5.5}
        textAlign="center"
        color={color}
        anchorX="center"
        anchorY="middle"
        fillOpacity={opacity}
      >
        {displayText}
        <meshStandardMaterial
          ref={materialRef}
          emissive={color}
          emissiveIntensity={1.5}
          toneMapped={false}
          transparent
          opacity={opacity}
        />
      </Text>
    </Float>
  );
};

// ─── Category Label ──────────────────────────────────────────────────────────

const CategoryLabel = ({ category, color }) => {
  const labelText = category === 'warning' ? '⚠ WARNING' : category === 'strategy' ? '🎯 STRATEGY' : '💡 TIP';

  return (
    <Text
      position={[0, 1.3, 0]}
      fontSize={0.14}
      color={color}
      anchorX="center"
      anchorY="middle"
      fillOpacity={0.7}
    >
      {labelText}
      <meshStandardMaterial
        emissive={color}
        emissiveIntensity={0.8}
        toneMapped={false}
        transparent
        opacity={0.7}
      />
    </Text>
  );
};

// ─── Main Canvas Component ───────────────────────────────────────────────────

const HintGlowCanvas = ({ hint }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (hint?.text) {
      setVisible(true);
    }
  }, [hint]);

  if (!visible || !hint?.text) return null;

  const color = CATEGORY_COLORS[hint.category] || '#8edcff';

  return (
    <div className="hint-canvas-wrapper">
      <div className="hint-canvas-label">
        <span className="progress-eyebrow">AI Hint Visualization</span>
      </div>
      <Canvas camera={{ position: [0, 0, 4.5], fov: 50 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.2} />
        <pointLight color={color} intensity={6} position={[2, 2, 3]} />
        <pointLight color={color} intensity={4} position={[-2, -1, 2]} />

        <CategoryLabel category={hint.category} color={color} />
        <GlowText text={hint.text} color={color} />
        <GlowParticles color={color} />
      </Canvas>
      <button
        className="hint-canvas-close"
        onClick={() => setVisible(false)}
        type="button"
        aria-label="Close hint visualization"
      >
        ✕
      </button>
    </div>
  );
};

export default HintGlowCanvas;
