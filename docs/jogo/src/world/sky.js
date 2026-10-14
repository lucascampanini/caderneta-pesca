// Dynamic sky + sun + moon-lit nights + stars, driving the scene lighting,
// fog, water sun uniforms and tone-mapping exposure from the game clock.

import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { lerp, clamp, smoothstep01, degToRad } from "../utils/utils.js";

export class SkySystem {
  constructor(scene, renderer, sunLight, hemiLight, ambient, water) {
    this.scene = scene;
    this.renderer = renderer;
    this.sunLight = sunLight;
    this.hemiLight = hemiLight;
    this.ambient = ambient;
    this.water = water;

    this.sky = new Sky();
    this.sky.scale.setScalar(3000);
    scene.add(this.sky);

    this.sunDir = new THREE.Vector3(0, 1, 0);
    this.sunColor = new THREE.Color(0xffffff);
    this.dayFactor = 1;

    this.stars = this.buildStars();
    scene.add(this.stars);
    this.clouds = this.buildClouds();
    scene.add(this.clouds);
    this.dome = this.buildDome();
    scene.add(this.dome);
    this._cloudDay = new THREE.Color(0xffffff);
    this._cloudDusk = new THREE.Color(0xffb38a);
    this._cloudNight = new THREE.Color(0x1d2840);
    this._cloudGray = new THREE.Color(0xb9c1c9);
    this._cloudCol = new THREE.Color();

    this._fogDay = new THREE.Color();
    this._fogNight = new THREE.Color();
    this._fogMix = new THREE.Color();
    this._duskTint = new THREE.Color(0xff9a5e);
    this._hemiSkyDay = new THREE.Color(0xbcd9ff);
    this._hemiSkyNight = new THREE.Color(0x1c2b4a);
    this._hemiGndDay = new THREE.Color(0x56683c);
    this._hemiGndNight = new THREE.Color(0x0c1218);
    this._sunWarm = new THREE.Color(0xffb46b);
    this._sunWhite = new THREE.Color(0xfff4e0);
    this._moonBlue = new THREE.Color(0x90b4e8);
  }

  buildStars() {
    const count = 900;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // random points on the upper hemisphere of a big shell
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.95);
      const r = 1900;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) + 30;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xcfe2ff,
      size: 2.4,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    });
    const points = new THREE.Points(geo, mat);
    points.renderOrder = -1;
    return points;
  }

  /** Cúpula de degradê para o meio do dia: azul fundo no alto, azul claro no horizonte e um halo em volta do sol.
   *  O céu físico (Sky) continua cuidando do nascer, do pôr do sol e da noite; a cúpula entra por cima só de dia. */
  buildDome() {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        zen: { value: new THREE.Color(0x2c66b0) },
        hor: { value: new THREE.Color(0xb3d1e8) },
        sunDir: { value: new THREE.Vector3(0, 1, 0) },
        alpha: { value: 1 },
      },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 zen; uniform vec3 hor; uniform vec3 sunDir; uniform float alpha; varying vec3 vDir;
        void main(){
          float h = clamp(vDir.y, 0.0, 1.0);
          vec3 c = mix(hor, zen, pow(h, 0.55));
          float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
          c += vec3(1.0, 0.95, 0.85) * (pow(s, 400.0) * 1.2 + pow(s, 12.0) * 0.18);
          // abaixo do horizonte some (a água e a mata cobrem)
          float a = alpha * smoothstep(-0.08, 0.02, vDir.y);
          gl_FragColor = vec4(c, a);
        }`,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1450, 32, 16), mat);
    dome.renderOrder = -2;
    return dome;
  }

  /** Cúmulos do céu do Pantanal: sprites com textura de nuvem gerada em canvas, espalhados no horizonte. */
  buildClouds() {
    const cv = document.createElement("canvas");
    cv.width = 256; cv.height = 128;
    const ctx = cv.getContext("2d");
    for (let i = 0; i < 26; i++) {
      const x = 40 + Math.random() * 176, y = 52 + Math.random() * 40 - (Math.abs(x - 128) / 128) * 10;
      const r = 18 + Math.random() * 30;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(255,255,255,0.95)");
      g.addColorStop(0.6, "rgba(255,255,255,0.55)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    // base mais reta e um pouco mais escura, como cúmulo de verdade
    const sh = ctx.createLinearGradient(0, 60, 0, 110);
    sh.addColorStop(0, "rgba(0,0,0,0)");
    sh.addColorStop(1, "rgba(120,130,145,0.35)");
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = sh; ctx.fillRect(0, 0, 256, 128);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const g = new THREE.Group();
    this.cloudMats = [];
    for (let i = 0; i < 34; i++) {
      const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: 0.9, toneMapped: false });
      this.cloudMats.push(m);
      const s = new THREE.Sprite(m);
      const a = Math.random() * Math.PI * 2, r = 1000 + Math.random() * 300;
      s.position.set(Math.cos(a) * r, 120 + Math.random() * 260, Math.sin(a) * r);
      const w = 260 + Math.random() * 380;
      s.scale.set(w, w * (0.36 + Math.random() * 0.14), 1);
      g.add(s);
    }
    return g;
  }

  /**
   * @param {number} hours      0-24 game time
   * @param {number} cloud      0 clear, 1 fully cloudy
   * @param {object} loc        active location definition (sky/fog params)
   */
  update(hours, cloud, loc) {
    const elevDeg = Math.sin(((hours - 6) / 12) * Math.PI) * 62;
    // o sol nasce à direita, passa por trás do pescador ao meio-dia e se põe à esquerda:
    // assim o céu à frente (onde se arremessa) fica azul, sem o clarão do sol na cara
    const azimuthDeg = 90 - ((hours - 6) / 12) * 180;
    const isDay = elevDeg > -2;

    // day/night blend factor: 0 = deep night, 1 = full day
    const f = smoothstep01((elevDeg + 10) / 22);
    this.dayFactor = f;

    // The Sky shader renders the sun where sunPosition points; at night we
    // park it below the horizon and let the moon take over the light rig.
    const phi = degToRad(90 - elevDeg);
    const theta = degToRad(azimuthDeg);
    this.sunDir.setFromSphericalCoords(1, phi, theta);

    const u = this.sky.material.uniforms;
    u.sunPosition.value.copy(this.sunDir);
    u.turbidity.value = loc.sky.turbidity + cloud * 9;
    u.rayleigh.value = Math.max(0.08, loc.sky.rayleigh * lerp(0.12, 1, f)) * (1 - cloud * 0.35);
    u.mieCoefficient.value = loc.sky.mieCoefficient + cloud * 0.004;
    u.mieDirectionalG.value = loc.sky.mieDirectionalG;

    // light rig: sun by day, soft blue moon by night
    const horizonWarmth = clamp(1 - Math.abs(elevDeg) / 18, 0, 1);
    if (isDay) {
      this.sunColor.copy(this._sunWhite).lerp(this._sunWarm, horizonWarmth);
      this.sunLight.color.copy(this.sunColor);
      this.sunLight.intensity = lerp(0.15, 3.6, f) * (1 - cloud * 0.4);
      this.sunLight.position.copy(this.sunDir).multiplyScalar(120);
    } else {
      const moonDir = this.sunDir.clone().multiplyScalar(-1);
      moonDir.y = Math.abs(moonDir.y) * 0.7 + 0.25;
      this.sunColor.copy(this._moonBlue);
      this.sunLight.color.copy(this._moonBlue);
      this.sunLight.intensity = 0.32 * (1 - cloud * 0.3);
      this.sunLight.position.copy(moonDir).normalize().multiplyScalar(120);
    }

    this.hemiLight.color.copy(this._hemiSkyNight).lerp(this._hemiSkyDay, f);
    this.hemiLight.groundColor.copy(this._hemiGndNight).lerp(this._hemiGndDay, f);
    this.hemiLight.intensity = lerp(0.22, 1.0, f) * (1 - cloud * 0.2);
    this.ambient.intensity = lerp(0.06, 0.14, f);

    // fog: blend location palettes, tint warm at dawn/dusk, thicken at night/clouds
    this._fogDay.setHex(loc.fog.day);
    this._fogNight.setHex(loc.fog.night);
    this._fogMix.copy(this._fogNight).lerp(this._fogDay, f);
    if (isDay) this._fogMix.lerp(this._duskTint, horizonWarmth * 0.35);
    this.scene.fog.color.copy(this._fogMix);
    this.scene.fog.density = loc.fog.density * (1 + (1 - f) * 0.55 + cloud * 0.35);

    this.renderer.toneMappingExposure = lerp(0.3, 0.5, f);

    this.stars.material.opacity = (1 - f) * (1 - cloud * 0.8) * 0.9;

    // nuvens: brancas de dia, alaranjadas no nascer e pôr do sol, escuras à noite, cinza com tempo fechado
    this._cloudCol.copy(this._cloudNight).lerp(this._cloudDay, f);
    if (isDay) this._cloudCol.lerp(this._cloudDusk, horizonWarmth * 0.7);
    this._cloudCol.lerp(this._cloudGray, cloud * 0.6 * f);
    for (const m of this.cloudMats) {
      m.color.copy(this._cloudCol);
      m.opacity = lerp(0.35, 0.92, f) * (0.75 + cloud * 0.25);
    }
    this.clouds.rotation.y += 0.00004;

    // degradê de dia: entra quando o sol já subiu e sai no fim da tarde; tempo fechado deixa mais cinza
    const du = this.dome.material.uniforms;
    du.sunDir.value.copy(this.sunDir);
    du.alpha.value = clamp((elevDeg - 6) / 16, 0, 1) * 0.92;
    du.zen.value.setHex(0x2c66b0).lerp(this._cloudGray, cloud * 0.55);
    du.hor.value.setHex(0xb3d1e8).lerp(this._cloudGray, cloud * 0.4);

    // water picks up the active light source
    this.water.setSun(
      isDay ? this.sunDir : this.sunLight.position.clone().normalize(),
      this.sunColor
    );
  }
}
