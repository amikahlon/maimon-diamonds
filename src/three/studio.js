/**
 * The photographer's studio, as an environment cube.
 * Ported from the original page: softboxes for brilliance, black flags for
 * contrast, and the MD monogram on the walls — so the gold and the stone
 * reflect the brand. A moving strip light produces the intro "light sweep".
 */
import * as THREE from 'three';

export function createStudio(renderer, { size = 256 } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xF2EDE3).multiplyScalar(.82);

  const light = k => new THREE.MeshBasicMaterial({ color: new THREE.Color(1, .985, .96).multiplyScalar(k), side: THREE.DoubleSide, toneMapped: false });
  const black = new THREE.MeshBasicMaterial({ color: 0x0b0a09, side: THREE.DoubleSide, toneMapped: false });
  const card = (mat, w, h, pos, look = new THREE.Vector3()) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.copy(pos); m.lookAt(look); scene.add(m); return m;
  };
  card(light(6), 7, 7, new THREE.Vector3(0, 6, 0));                 // overhead softbox
  card(light(4.5), 1.3, 9, new THREE.Vector3(-6, 1, 1.5));          // strip boxes
  card(light(4.5), 1.3, 9, new THREE.Vector3(6, 1, 1.5));
  card(light(9), 2.2, .9, new THREE.Vector3(2.2, 3.4, 5));          // small keys
  card(light(9), 2.2, .9, new THREE.Vector3(-2.6, 2.8, 5));
  card(light(1.15), 30, 30, new THREE.Vector3(0, -6, 0));           // warm bounce floor (keeps the gold bright)
  card(black, 9, 2.2, new THREE.Vector3(0, -4.5, -4));             // low black card → defined edges on the metal
  card(black, 2.4, 10, new THREE.Vector3(-4.2, 0, -4.2));           // black flags
  card(black, 2.4, 10, new THREE.Vector3(4.6, 0, -3.6));
  card(black, 1.6, 10, new THREE.Vector3(0, 0, 6.2));
  card(black, 1.2, 8, new THREE.Vector3(3.6, -.5, 4.2));            // front flags → dark bands on the shank
  card(black, 1.2, 8, new THREE.Vector3(-3.9, -.5, 3.8));
  for (let i = 0; i < 10; i++) {                                    // tiny speculars → scintillation
    const a = i / 10 * Math.PI * 2;
    card(light(14), .35, .35, new THREE.Vector3(Math.cos(a) * 5, 2.2 + Math.sin(i * 1.7) * 1.2, Math.sin(a) * 5));
  }

  // monogram walls
  const c = document.createElement('canvas'); c.width = 1024; c.height = 640;
  const monoTex = new THREE.CanvasTexture(c); monoTex.colorSpace = THREE.SRGBColorSpace;
  const drawMonogram = () => {
    const g = c.getContext('2d');
    g.fillStyle = '#F2EDE3'; g.fillRect(0, 0, 1024, 640);
    g.fillStyle = '#15120F'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '500 600px "Bodoni Moda", Didot, "Times New Roman", serif';
    g.fillText('MD', 512, 350);
    g.fillStyle = '#F2EDE3'; g.fillRect(0, 290, 1024, 90);
    monoTex.needsUpdate = true;
  };
  drawMonogram();
  const monoMat = new THREE.MeshBasicMaterial({ map: monoTex, side: THREE.DoubleSide, toneMapped: false });
  card(monoMat, 11, 6.9, new THREE.Vector3(0, .4, -6.5));
  card(monoMat, 11, 6.9, new THREE.Vector3(0, .6, 7.5));

  // the sweep: a hot strip that travels across the front of the set
  const sweep = card(light(22), 1.1, 12, new THREE.Vector3(-12, 0, 4.5), new THREE.Vector3(-12, 0, 0));
  sweep.visible = false;

  const cubeRT = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  const cubeCam = new THREE.CubeCamera(.1, 60, cubeRT);
  const pmrem = new THREE.PMREMGenerator(renderer);
  let pmremRT = null;

  function render() {
    cubeCam.update(renderer, scene);
    pmremRT = pmrem.fromCubemap(cubeRT.texture, pmremRT);
  }
  function setSweep(p) {           // p: 0 → 1, null = off
    sweep.visible = p != null && p > 0 && p < 1;
    if (sweep.visible) { const x = -9 + p * 18; sweep.position.set(x, 0, 4.5); sweep.lookAt(x, 0, 0); }
  }
  render();
  document.fonts?.ready.then(() => { drawMonogram(); render(); });

  return {
    cube: cubeRT.texture,                    // for the refraction shader
    get pmrem() { return pmremRT.texture; }, // for physical materials
    render, setSweep,
    dispose() { cubeRT.dispose(); pmremRT?.dispose(); pmrem.dispose(); },
  };
}
