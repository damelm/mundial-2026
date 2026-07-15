/* Copa 3D dorada girando (WebGL / Three.js). Se carga en un chunk aparte
 * (import dinámico) solo cuando aparece la fase final, así no pesa en el
 * arranque ni en Lighthouse. En gama baja no se monta (el llamador cae al
 * ícono plano). Respeta prefers-reduced-motion (no gira). */

import { useEffect, useRef } from "react";
import type { Mesh } from "three";

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
        p(0.0, -2.05), p(0.9, -2.05), p(0.92, -1.86), p(0.58, -1.76),
        p(0.30, -1.58), p(0.235, -1.15), p(0.22, -0.6), p(0.235, -0.05),
        p(0.30, 0.45), p(0.42, 0.9), p(0.57, 1.28), p(0.71, 1.62),
        p(0.75, 1.86), p(0.63, 2.05), p(0.47, 2.16), p(0.0, 2.2),
      ];
      const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 96), gold);

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
