import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as random from 'maath/random/dist/maath-random.esm';

const Stars = (props) => {
  const reference = useRef(null);
  const sphere = useMemo(() => random.inSphere(new Float32Array(7500), { radius: 1.8 }), []);

  useFrame((_state, delta) => {
    if (!reference.current) {
      return;
    }

    reference.current.rotation.x -= delta / 10;
    reference.current.rotation.y -= delta / 15;
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={reference} frustumCulled={false} positions={sphere} stride={3} {...props}>
        <PointMaterial
          color="#dcecff"
          depthWrite={false}
          size={0.0024}
          sizeAttenuation={true}
          transparent
        />
      </Points>
    </group>
  );
};

const AnimatedBackground = () => (
  <div aria-hidden="true" className="space-backdrop">
    <Canvas camera={{ position: [0, 0, 1] }}>
      <Stars />
    </Canvas>
  </div>
);

export default AnimatedBackground;
