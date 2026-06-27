"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CssAgentOrb } from "@/components/fx/css-orb";
import { WebGLBoundary, hasWebGL } from "@/components/fx/webgl-boundary";

// ===========================================================================
// Hero 3D — a particle sphere that represents "an AI agent under test".
// A red attack-wave sweeps through it on loop (the live red-team scan); points
// the wave touches flare red and push outward. Mouse parallax + slow spin.
// Pure custom GLSL on THREE.Points + additive blending = glow with no
// post-processing dependency, so it stays bulletproof for the demo.
// ===========================================================================

const POINTS = 7000;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uScan;
  uniform float uSize;
  varying float vIntensity;
  varying float vDepth;

  float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }

  void main(){
    vec3 pos = position;
    // proximity to the sweeping scan plane (travels along Y)
    float d = abs(pos.y - uScan);
    float ring = smoothstep(0.22, 0.0, d);
    // gentle breathing so idle state still feels alive
    float breathe = sin(uTime*0.7 + hash(position)*6.2831) * 0.012;
    vec3 dir = normalize(pos);
    pos += dir * (ring * 0.16 + breathe);

    vIntensity = ring;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (1.0 + ring*2.6) * (300.0 / -mv.z);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColorBase;
  uniform vec3 uColorBreak;
  varying float vIntensity;
  varying float vDepth;

  void main(){
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);
    float alpha = smoothstep(0.5, 0.0, dist);
    if(alpha < 0.01) discard;

    vec3 col = mix(uColorBase, uColorBreak, vIntensity);
    col += uColorBreak * vIntensity * 0.5;        // glow boost on break
    float fog = smoothstep(11.0, 3.0, vDepth);    // fade distant points
    alpha *= mix(0.10, 0.6, fog);                 // keep additive stack from blowing out

    gl_FragColor = vec4(col, alpha);
  }
`;

function fibonacciSphere(count: number, radius: number) {
  const arr = new Float32Array(count * 3);
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    arr[i * 3] = Math.cos(theta) * r * radius;
    arr[i * 3 + 1] = y * radius;
    arr[i * 3 + 2] = Math.sin(theta) * r * radius;
  }
  return arr;
}

function AgentSphere() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { pointer } = useThree();

  const positions = useMemo(() => fibonacciSphere(POINTS, 1.9), []);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScan: { value: -2 },
      uSize: { value: 1.5 },
      uColorBase: { value: new THREE.Color("#39404e") },
      uColorBreak: { value: new THREE.Color("#ff3b3b") },
    }),
    [],
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = t;
      // scan plane sweeps -2 -> 2 every ~3.6s, with a pause feel via sin
      const sweep = ((t * 0.55) % 2.4) - 1.2;
      matRef.current.uniforms.uScan.value = sweep * 1.7;
    }
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.07;
      // mouse parallax (eased)
      groupRef.current.rotation.x +=
        (pointer.y * 0.25 - groupRef.current.rotation.x) * 0.04;
      const targetZ = pointer.x * 0.35;
      groupRef.current.rotation.z += (targetZ - groupRef.current.rotation.z) * 0.04;
    }
  });

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
            count={POINTS}
          />
        </bufferGeometry>
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* two thin crosshair rings for "target" framing */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.35, 0.004, 8, 160]} />
        <meshBasicMaterial color="#ff3b3b" transparent opacity={0.32} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[0, 0, 0]}>
        <torusGeometry args={[2.6, 0.003, 8, 160]} />
        <meshBasicMaterial color="#9fb0c9" transparent opacity={0.14} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

function Dust() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 14;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2;
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.012;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={900} />
      </bufferGeometry>
      <pointsMaterial
        size={0.016}
        color="#3a4660"
        transparent
        opacity={0.35}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 40 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
    >
      <fog attach="fog" args={["#08080a", 6, 13]} />
      <AgentSphere />
      <Dust />
    </Canvas>
  );
}

export default function Hero3D() {
  // Decide once on the client whether WebGL is usable; otherwise show the
  // CSS orb. The error boundary covers mid-session context loss.
  const [webgl, setWebgl] = useState<boolean | null>(null);
  useEffect(() => setWebgl(hasWebGL()), []);

  if (webgl === false) return <CssAgentOrb />;
  if (webgl === null) return null; // brief, avoids a flash before probe
  return (
    <WebGLBoundary fallback={<CssAgentOrb />}>
      <Scene />
    </WebGLBoundary>
  );
}
