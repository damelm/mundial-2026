/* Copa 3D dorada girando (WebGL / Three.js). Se carga en un chunk aparte
 * (import dinámico) solo cuando aparece la fase final, así no pesa en el
 * arranque ni en Lighthouse. En gama baja no se monta (el llamador cae al
 * ícono plano). Respeta prefers-reduced-motion (no gira). */

import { useEffect, useRef } from "react";
import type { Mesh, Vector2 } from "three";

type ThreeNS = typeof import("three");

/* Revoluciona un perfil (radio, altura) alrededor del eje Y, pero girando y
 * ondulando cada anillo un poco más a medida que sube: da la torsión en
 * espiral del trofeo. La base arranca lisa (ease) y no gira. */
function twistedRevolve(
  THREE: ThreeNS,
  profile: Vector2[],
  opts: { segments: number; lobes: number; lobeAmp: number; twist: number },
) {
  const { segments, lobes, lobeAmp, twist } = opts;
  const rings = profile.length;
  const yMin = profile[0].y;
  const yMax = profile[rings - 1].y;
  const span = yMax - yMin || 1;
  const per = segments + 1;
  const pos: number[] = [];
  for (let i = 0; i < rings; i++) {
    const r = profile[i].x;
    const y = profile[i].y;
    const f = (y - yMin) / span; // 0 abajo → 1 arriba
    const ease = f * f * (3 - 2 * f); // smoothstep: liso en la base
    const tw = twist * f;
    const amp = lobeAmp * ease;
    for (let s = 0; s <= segments; s++) {
      const th = (s / segments) * Math.PI * 2;
      const rr = r * (1 + amp * Math.cos(lobes * th));
      const a = th + tw;
      pos.push(rr * Math.cos(a), y, rr * Math.sin(a));
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < rings - 1; i++) {
    for (let s = 0; s < segments; s++) {
      const a = i * per + s;
      const b = a + 1;
      const c = a + per;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export default function Trophy3D({ size = 150 }: { size?: number }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      const { RoomEnvironment } = await import(
        "three/examples/jsm/environments/RoomEnvironment.js"
      );
      if (disposed || !host.current) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
      camera.position.set(0, 0.2, 8.6);
      camera.lookAt(0, 0.05, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(size, size);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      host.current.appendChild(renderer.domElement);

      // Reflejos de estudio para que el oro se vea metálico.
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
      scene.environment = envRT.texture;

      const gold = new THREE.MeshStandardMaterial({
        color: 0xe7b84b,
        metalness: 1,
        roughness: 0.24,
        envMapIntensity: 1.35,
        side: THREE.DoubleSide,
      });

      // Trofeo de la Copa del Mundo (estilizado): cuerpo dorado que sube y se
      // abre como dos brazos, y el globo terráqueo encima. El cuerpo es una
      // silueta (radio, altura) revolucionada; el globo, una esfera con
      // meridianos. Revuelve bien al girar.
      const p = (r: number, y: number) => new THREE.Vector2(r, y);
      const profile = [
        p(0.0, -2.1), p(0.92, -2.05), p(0.94, -1.85), p(0.5, -1.7),
        p(0.28, -1.5), p(0.24, -1.0), p(0.24, -0.4), p(0.3, 0.1),
        p(0.42, 0.6), p(0.58, 1.05), p(0.72, 1.5), p(0.76, 1.8),
        p(0.6, 2.0), p(0.44, 2.12), p(0.0, 2.18),
      ];
      // Cuerpo con torsión en espiral y estrías (las figuras estilizadas que
      // suben sosteniendo el mundo). Se revoluciona el perfil pero cada anillo
      // se gira y se ondula más a medida que sube; la base queda lisa.
      const body = new THREE.Mesh(
        twistedRevolve(THREE, profile, {
          segments: 140,
          lobes: 3,
          lobeAmp: 0.09,
          twist: Math.PI * 1.15,
        }),
        gold,
      );

      const globe = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.72, 48, 32), gold);
      globe.add(ball);
      // Meridianos/paralelos tenues para que lea como "el mundo".
      const lineMat = new THREE.MeshStandardMaterial({
        color: 0xb58f34,
        metalness: 1,
        roughness: 0.35,
      });
      const ring = () => new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.012, 8, 72), lineMat);
      const eq = ring();
      eq.rotation.x = Math.PI / 2;
      globe.add(eq);
      const m1 = ring();
      globe.add(m1);
      const m2 = ring();
      m2.rotation.y = Math.PI / 3;
      globe.add(m2);
      globe.position.y = 2.66;
      globe.rotation.z = 0.18;

      const group = new THREE.Group();
      group.add(body, globe);
      group.position.y = -0.42;
      group.rotation.x = 0.05;
      scene.add(group);

      scene.add(new THREE.AmbientLight(0xffffff, 0.35));
      const key = new THREE.DirectionalLight(0xfff2cf, 2.2);
      key.position.set(3, 4, 5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0x4fd1e0, 1.1);
      rim.position.set(-4, -1, -3);
      scene.add(rim);
      const fill = new THREE.PointLight(0xe7b84b, 0.6, 20);
      fill.position.set(0, 1, 4);
      scene.add(fill);

      const reduce =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const loop = () => {
        raf = requestAnimationFrame(loop);
        if (!reduce) group.rotation.y += 0.018;
        renderer.render(scene, camera);
      };
      loop();

      cleanup = () => {
        cancelAnimationFrame(raf);
        group.traverse((o) => {
          const m = o as Mesh;
          if (m.geometry) m.geometry.dispose();
        });
        gold.dispose();
        lineMat.dispose();
        envRT.dispose();
        pmrem.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [size]);

  return (
    <div
      ref={host}
      style={{ width: size, height: size }}
      className="grid place-items-center"
      aria-hidden="true"
    />
  );
}
