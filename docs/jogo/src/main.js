// TIDELINE — bootstrap, game loop, state machine wiring and input routing.

import * as THREE from "three";
import { CONFIG } from "./data/config.js";
import { LOCATION_BY_ID, LOCATIONS } from "./data/locationData.js";
import { S, events, machine, Phase, isGameplayPhase } from "./state/gameState.js";
import { loadGame, saveGame, resetSave, syncFromCloud, mochilaDoSite } from "./state/saveLoad.js";
import { aplicarMochila } from "./state/mochila.js";
import { audio } from "./audio/audioManager.js";
import { createCore } from "./core/scene.js";
import { GameClock } from "./core/time.js";
import { CameraRig } from "./core/cameraRig.js";
import { WaterSurface } from "./world/water.js";
import { SkySystem } from "./world/sky.js";
import { PostFX } from "./world/postfx.js"; // [ceu]
import { EnvironmentManager } from "./world/environment.js";
import { setVento } from "./world/impostores.js";
import { Effects } from "./world/effects.js";
import { CastingSystem } from "./gameplay/casting.js";
import { Bobber } from "./gameplay/bobber.js";
import { BiteSystem } from "./gameplay/biteSystem.js";
import { ReelFight } from "./gameplay/reelMinigame.js";
import * as economy from "./economy/economy.js";
import { HUD } from "./ui/hud.js";
import { Screens } from "./ui/screens.js";
import { ShopUI } from "./ui/shop.js";
import { JournalUI } from "./ui/journal.js";
import { MapUI } from "./ui/map.js";
import { CatchCard } from "./ui/catchCard.js";
import { preloadFishPhotos } from "./fish/fishFactory.js";
import { lerp, randRange, projectToScreen } from "./utils/utils.js";
import { Tutorial } from "./ui/tutorial.js";
import { compat, avaliar, dicaConjunto } from "./gameplay/rules.js";

// ---------------------------------------------------------------------------
// boot
// ---------------------------------------------------------------------------

await syncFromCloud();
loadGame();
// equipamento cadastrado na "Minha mochila" do site já vem liberado no jogo
const daMochila = aplicarMochila(mochilaDoSite);
// conta de administrador: todos os pesqueiros abertos (dinheiro e nível já são livres em economy.modoDono)
if (economy.modoDono()) for (const l of LOCATIONS) if (!S.world.unlocked.includes(l.id)) S.world.unlocked.push(l.id);

const container = document.getElementById("canvas-wrap");
const core = createCore(container);
const { renderer, scene, camera } = core;

const gclock = new GameClock(S.world.hour);
const rig = new CameraRig(camera);
const water = new WaterSurface(scene, S.settings.quality);
const sky = new SkySystem(scene, renderer, core.sunLight, core.hemiLight, core.ambient, water);
const postfx = new PostFX(renderer, scene, camera); // [ceu] pós-processamento (bloom, ACES, cor, vinheta)
const env = new EnvironmentManager(scene);
const effects = new Effects(scene);
const casting = new CastingSystem(scene);
casting.effects = effects; // [briga] marolinha e risco da linha na água
const bobber = new Bobber(scene, effects);
const bite = new BiteSystem(
  () => ({
    location: currentLoc(),
    hours: gclock.hours,
    weather: S.world.weather,
    bait: economy.getStats().bait,
    eq: economy.getEquipped(),
    tutorial: tutorial.treino(),
  }),
  bobber
);
const fight = new ReelFight(scene, effects, audio);

const hud = new HUD();
const tutorial = new Tutorial();
const catchCard = new CatchCard();
const shopUI = new ShopUI(() => machine.set(Phase.IDLE));
const journalUI = new JournalUI(() => machine.set(Phase.IDLE));
const mapUI = new MapUI(
  () => machine.set(Phase.IDLE),
  (locId) => {
    travelTo(locId);
    machine.set(Phase.IDLE);
  }
);
const screens = new Screens({
  onPlay: () => {
    machine.set(Phase.IDLE);
    if (tutorial.ativo()) tutorial.mostrar(S.tutorial.step);
  },
  onTutorial: () => {
    setPaused(false);
    machine.set(Phase.IDLE);
    tutorial.comecar();
  },
  onResume: () => setPaused(false),
  onQuitToMenu: () => {
    saveGame();
    setPaused(false);
    machine.set(Phase.MENU);
    hud.toast("Progresso salvo", "success");
  },
  onResetSave: () => {
    resetSave();
    applySettings();
    travelTo(S.world.current, true);
    gclock.hours = S.world.hour;
    screens.showMenu(false);
    if (machine.current !== Phase.MENU) machine.set(Phase.MENU);
    hud.refreshAll();
    hud.toast("Progresso apagado: diário novo", "warn");
  },
  onQualityChange: (q) => {
    core.setQuality(q);
    water.setQuality(q);
    travelTo(S.world.current, true); // a densidade da vegetação e os modelos dependem da qualidade
    saveGame();
  },
});

const currentLoc = () => LOCATION_BY_ID[S.world.current] ?? LOCATION_BY_ID.lake;

function applySettings() {
  audio.setVolume(S.settings.volume);
  audio.setMuted(S.settings.muted);
  core.setQuality(S.settings.quality);
  water.setQuality(S.settings.quality);
}

function travelTo(locId, silent = false) {
  const loc = LOCATION_BY_ID[locId] ?? LOCATION_BY_ID.lake;
  S.world.current = loc.id;
  bite.cancel();
  bobber.hide();
  if (fight.active) fight.end();
  env.load(loc);
  preloadFishPhotos(loc.fishTable.map(([id]) => id));
  casting.attachTo(env.playerSpot);
  rig.setAnchor(env.playerSpot);
  water.setParams(loc.water);
  effects.setLocationAmbient(loc);
  audio.setAmbience(loc.ambience, gclock.segment);
  hud.updateLocation();
  events.emit("location", { id: loc.id });
  if (!silent) {
    saveGame();
    hud.toast(`Pescando em: ${loc.name}`);
  }
}

// ---------------------------------------------------------------------------
// pause (an overlay flag, not a phase — resuming never re-enters a phase)
// ---------------------------------------------------------------------------

let paused = false;

function setPaused(on) {
  if (paused === on) return;
  if (on && !isGameplayPhase(machine.current)) return;
  paused = on;
  if (on) {
    fight.setReeling(false);
    inputHeld = false;
    screens.showPause();
    saveGame();
  } else {
    screens.hideAll();
  }
}

// ---------------------------------------------------------------------------
// state machine
// ---------------------------------------------------------------------------

machine.register(Phase.MENU, {
  enter() {
    bite.cancel();
    bobber.hide();
    if (fight.active) fight.end();
    casting.setBend(0);
    casting.setLineTension(0);
    hud.hide();
    rig.setMode("menu");
    screens.showMenu(S.stats.catches > 0 || S.profile.money !== CONFIG.economy.startMoney || S.profile.level > 1);
  },
});

machine.register(Phase.IDLE, {
  enter() {
    screens.hideAll();
    shopUI.close();
    journalUI.close();
    mapUI.close();
    bite.cancel();
    bobber.hide();
    casting.setBend(0);
    casting.setLineTension(0);
    casting.setReelMotion(0, 0);
    rig.setMode("play");
    rig.setFocus(null);
    hud.show();
    hud.setClock(gclock.hours, gclock.segment);
  },
});

machine.register(Phase.CHARGING, {
  enter() {
    casting.beginCharge();
    audio.play("pickupAbre"); // [briga] abre a alça do pick-up
    hud.showPower(true);
  },
  exit() {
    hud.showPower(false);
    rig.setFovPulse(0);
  },
});

machine.register(Phase.FLYING, {
  enter() {
    S.stats.casts += 1;
    audio.play("whoosh");
    audio.play("linhaAssobio", { dur: Math.max(0.5, (2 * bobber.vel.y) / 9.8) }); // [briga] linha assobiando no voo
  },
});

machine.register(Phase.WAITING, {});

machine.register(Phase.BITE, {});

machine.register(Phase.REELING, {
  enter({ fish }) {
    bobber.hide();
    hud.showReel(true, fish);
    const eq = economy.getEquipped();
    const av = avaliar(fish.speciesId, eq, fish.sizeNorm);
    lastAv = av;
    fight.start(fish, lastBobberPos.clone(), env.playerSpot, { reelSpeed: eq.reel.speed, lineStrength: av.lineStrength, control: av.control, av });
    fight.setReeling(inputHeld);
    rig.setFocus(fight.fishPoint);
    audio.play("hook");
  },
  exit() {
    rig.setFocus(null);
    casting.setBend(0);
    casting.setLineTension(0);
    casting.setReelMotion(0, 0);
    audio.fightStop();
    rig.setBriga(null); // [briga]
    hud.showReel(false);
  },
});

machine.register(Phase.CATCH, {});

machine.register(Phase.RETRIEVING, {
  enter() {
    bite.cancel();
    bobber.startRetrieve();
  },
});

machine.register(Phase.SHOP, {
  enter(data) {
    shopUI.open(data?.tab ?? (S.inventory.length ? "sell" : "rods"));
  },
  exit() {
    shopUI.close();
  },
});

machine.register(Phase.JOURNAL, {
  enter() {
    journalUI.open();
  },
  exit() {
    journalUI.close();
  },
});

machine.register(Phase.MAP, {
  enter() {
    mapUI.open();
  },
  exit() {
    mapUI.close();
  },
});

// ---------------------------------------------------------------------------
// gameplay event wiring
// ---------------------------------------------------------------------------

// vibração no celular (ignorada onde não existe)
const vibrar = (p) => { try { navigator.vibrate?.(p); } catch { /* sem vibração */ } };
let ultimaArrancada = "calm";

const lastBobberPos = new THREE.Vector3();
let lastAv = null;

events.on("bobber:landed", ({ distance, zone }) => {
  audio.play("boiaCai", { strength: 0.9 }); // [briga] boia caindo na água
  casting.fecharPickup(); // [briga] alça do pick-up fecha
  audio.play("pickupFecha"); // [briga]
  hud.setZone(`Água ${CONFIG.zones.labels[zone]} · ${Math.round(distance)} m da margem`);
  bite.begin(zone);
  machine.set(Phase.WAITING);
});

events.on("bobber:retrieved", () => {
  machine.set(Phase.IDLE);
});

events.on("bite:nibble", () => {
  audio.play("plip");
  effects.ripple(bobber.pos, 1.5, 0.8);
});

events.on("bite:start", () => {
  lastBobberPos.copy(bobber.pos);
  audio.play("bite");
  vibrar(40);
  hud.shake();
  rig.addShake(0.3);
  effects.splash(bobber.pos, 0.7);
  effects.ripple(bobber.pos, 2.2, 0.9);
  machine.set(Phase.BITE);
});

events.on("bite:missed", () => {
  hud.toast("Demorou: ele cuspiu o anzol...", "warn");
  audio.play("escape");
  machine.set(Phase.WAITING);
});

events.on("bite:stolen", ({ reason }) => {
  audio.play("plip");
  effects.ripple(bobber.pos, 1.6, 0.8);
  hud.toast(`Roubou a isca! ${reason || ""}`, "warn");
});

events.on("bite:hooked", ({ fish }) => {
  lastBobberPos.copy(bobber.pos);
  casting.hookset();
  vibrar(60);
  machine.set(Phase.REELING, { fish });
});

events.on("fight:update", (data) => {
  hud.updateFight(data);
  if (data.landing) return;
  casting.setLineTension(data.tension / 100);
  // quanto a vara enverga depende da tensão e do peso do peixe frente à libragem da vara
  const eq = economy.getEquipped();
  const peso = fight.fish ? fight.fish.weightKg : 1;
  const carga = Math.min(1.35, Math.max(0.45, 0.45 + (peso * 2.2) / (eq.rod.lb[1] * 0.5)));
  casting.setBend((0.18 + (data.tension / 100) * 0.9) * carga + data.saindo * 0.15);
  casting.setReelMotion(data.reeling ? eq.reel.speed : 0, data.saindo);
  if (data.surge === "active") {
    rig.addShake(0.018);
    casting.tremor(0.5);
    if (ultimaArrancada !== "active") vibrar([80, 40, 120]);
  }
  ultimaArrancada = data.surge;
});

events.on("fight:headshake", ({ forca }) => {
  casting.tremor(forca);
  audio.play("headshake", { forca });
  vibrar(Math.round(12 + forca * 18));
  if ((fight.prof ?? 0) < 1.1) effects.splash(fight.fishPoint, 0.35 + forca * 0.3); // [briga] só espirra se o peixe está raso
});

events.on("fight:snap", () => {
  S.stats.snaps += 1;
  audio.fightStop();
  audio.play("snap");
  vibrar(220);
  hud.shake();
  rig.addShake(0.5);
  // explica o motivo: equipamento fraco para o peixe ou tensão demais
  if (lastAv && lastAv.fraco && !tutorial.treino()) hud.toast(`PLEC! A linha arrebentou. ${lastAv.problemas[0]}`, "warn");
  else hud.toast("PLEC! A linha arrebentou: a tensão chegou ao fim. Solte quando a barra ficar vermelha e nas arrancadas.", "warn");
  machine.set(Phase.IDLE);
});

events.on("fight:escape", ({ fish, reason, gear }) => {
  audio.play("escape");
  hud.toast(reason, "warn");
  if (gear && fish) hud.toast(`Dica da Caderneta: ${dicaConjunto(fish.speciesId)}`, "info");
  machine.set(Phase.IDLE);
});

events.on("fight:landed", ({ fish }) => {
  const result = economy.registerCatch(fish);
  vibrar([30, 40, 30]);
  rig.addShake(0.25);
  machine.set(Phase.CATCH);
  catchCard.show(fish, result, () => machine.set(Phase.IDLE));
});

events.on("gear", () => {
  casting.castMult = economy.getStats().castMult;
  casting.setGear(economy.getEquipped());
});
casting.castMult = economy.getStats().castMult;
casting.setGear(economy.getEquipped());

// ---------------------------------------------------------------------------
// input
// ---------------------------------------------------------------------------

let inputHeld = false;
let waitingHoldT = 0;
let spaceHeld = false;

function pressDown() {
  if (paused) return;
  audio.init();
  switch (machine.current) {
    case Phase.IDLE: {
      // vara e molinete têm que combinar, como na vida real
      const erro = compat(economy.getEquipped());
      if (erro) {
        audio.play("error");
        hud.toast(erro, "warn");
        break;
      }
      machine.set(Phase.CHARGING);
      break;
    }
    case Phase.BITE:
      bite.hookAttempt();
      break;
    case Phase.REELING:
      fight.setReeling(true);
      break;
    default:
      break;
  }
}

function pressUp() {
  if (paused) return;
  switch (machine.current) {
    case Phase.CHARGING: {
      const power = casting.endCharge();
      const { origin, velocity } = casting.computeLaunch(power, economy.getStats().castMult);
      bobber.launch(origin, velocity, env.playerSpot);
      machine.set(Phase.FLYING);
      break;
    }
    case Phase.REELING:
      fight.setReeling(false);
      break;
    default:
      break;
  }
}

container.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  inputHeld = true;
  waitingHoldT = 0;
  pressDown();
});

window.addEventListener("pointerup", (e) => {
  if (e.button !== 0) return;
  if (!inputHeld) return;
  inputHeld = false;
  waitingHoldT = 0;
  pressUp();
});

window.addEventListener("pointermove", (e) => {
  casting.setPointerX(e.clientX / window.innerWidth);
});

window.addEventListener("contextmenu", (e) => {
  if (e.target.closest("#canvas-wrap")) e.preventDefault();
});

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") e.preventDefault();
  if (e.repeat) return;

  switch (e.code) {
    case "Space":
      if (catchCard.active) return; // the card handles its own dismissal
      spaceHeld = true;
      inputHeld = true;
      waitingHoldT = 0;
      pressDown();
      break;
    case "KeyR":
      if (!paused && machine.is(Phase.WAITING)) machine.set(Phase.RETRIEVING);
      break;
    case "KeyM":
      toggleScreen(Phase.MAP);
      break;
    case "KeyB":
      toggleScreen(Phase.SHOP);
      break;
    case "KeyJ":
      toggleScreen(Phase.JOURNAL);
      break;
    case "Escape":
      handleEscape();
      break;
    default:
      break;
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "Space" && spaceHeld) {
    spaceHeld = false;
    inputHeld = false;
    waitingHoldT = 0;
    pressUp();
  }
});

function toggleScreen(phase) {
  if (paused) return;
  if (machine.is(phase)) {
    audio.play("click");
    machine.set(Phase.IDLE);
  } else if (machine.is(Phase.IDLE)) {
    audio.init();
    audio.play("click");
    machine.set(phase);
  }
}

function handleEscape() {
  if (catchCard.active) return;
  if (paused) {
    setPaused(false);
    return;
  }
  switch (machine.current) {
    case Phase.MENU:
      break;
    case Phase.CHARGING:
      casting.cancelCharge();
      machine.set(Phase.IDLE);
      break;
    case Phase.SHOP:
    case Phase.JOURNAL:
    case Phase.MAP:
      machine.set(Phase.IDLE);
      break;
    default:
      if (isGameplayPhase(machine.current)) setPaused(true);
      break;
  }
}

document.getElementById("btn-map").addEventListener("click", () => toggleScreen(Phase.MAP));
document.getElementById("btn-shop").addEventListener("click", () => toggleScreen(Phase.SHOP));
document.getElementById("btn-journal").addEventListener("click", () => toggleScreen(Phase.JOURNAL));
document.getElementById("btn-pause").addEventListener("click", () => {
  audio.play("click");
  setPaused(true);
});
document.getElementById("hud-kit").addEventListener("click", () => toggleScreen(Phase.SHOP));
document.getElementById("hud-bag").addEventListener("click", () => {
  if (machine.is(Phase.IDLE)) {
    audio.play("click");
    machine.set(Phase.SHOP, { tab: "sell" });
  }
});

window.addEventListener("pointerdown", () => audio.init(), { once: true });

// ---------------------------------------------------------------------------
// weather
// ---------------------------------------------------------------------------

let weatherTimer = randRange(...CONFIG.weather.changeEvery);
let cloudFactor = S.world.weather === "cloudy" ? 1 : 0;

function updateWeather(dt) {
  weatherTimer -= dt;
  if (weatherTimer <= 0) {
    weatherTimer = randRange(...CONFIG.weather.changeEvery);
    const next = Math.random() < CONFIG.weather.cloudyChance ? "cloudy" : "clear";
    if (next !== S.world.weather) {
      S.world.weather = next;
      events.emit("weather", { weather: next });
      const vento = next === "cloudy" ? 1.6 : 0.8;
      water.setWind?.(vento / 2);
      setVento(vento);
    }
  }
  const target = S.world.weather === "cloudy" ? 1 : 0;
  cloudFactor = lerp(cloudFactor, target, 1 - Math.exp(-0.35 * dt));
}

// ---------------------------------------------------------------------------
// main loop
// ---------------------------------------------------------------------------

const clock3 = new THREE.Clock();
let autosaveT = 0;
let lastMinute = -1;
let lastSegment = "";
const biteScreenPos = { x: 0, y: 0 };

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock3.getDelta(), 0.05);
  const dtM = dt * (fight.active ? fight.escalaTempo : 1); // [briga] câmera lenta curta nos pulos do peixe
  const phase = machine.current;
  const gameplay = isGameplayPhase(phase) && !paused;

  if (gameplay) {
    gclock.advance(dt);
    S.world.hour = gclock.hours;
    updateWeather(dt);

    autosaveT += dt;
    if (autosaveT >= CONFIG.autosaveEvery) {
      autosaveT = 0;
      saveGame();
    }
  }

  // clock display + ambience mood follow the in-game time
  const minute = Math.floor(gclock.hours * 60);
  if (minute !== lastMinute) {
    lastMinute = minute;
    if (!hud.root.classList.contains("hidden")) hud.setClock(gclock.hours, gclock.segment);
  }
  if (gclock.segment !== lastSegment) {
    lastSegment = gclock.segment;
    audio.setAmbienceSegment(lastSegment);
  }

  // world always breathes, even behind menus
  water.update(dtM); // [briga]
  sky.update(gclock.hours, cloudFactor, currentLoc());
  effects.update(dtM, camera, gclock.segment); // [briga]

  if (!paused) {
    const aiming = phase === Phase.IDLE || phase === Phase.CHARGING;
    casting.update(dtM, { aiming, previewVisible: aiming }); // [briga]

    switch (phase) {
      case Phase.CHARGING:
        hud.setPower(casting.power);
        rig.setFovPulse(casting.power);
        break;
      case Phase.FLYING:
        bobber.update(dt);
        break;
      case Phase.WAITING:
        bobber.update(dt);
        bite.update(dt);
        if (inputHeld) {
          waitingHoldT += dt;
          if (waitingHoldT >= CONFIG.bite.retrieveHoldTime) {
            waitingHoldT = 0;
            inputHeld = false;
            machine.set(Phase.RETRIEVING);
          }
        }
        break;
      case Phase.BITE: {
        bobber.update(dt);
        bite.update(dt);
        const p = projectToScreen(bobber.pos, camera, window.innerWidth, window.innerHeight, biteScreenPos);
        hud.positionBite(p);
        break;
      }
      case Phase.RETRIEVING:
        bobber.update(dt);
        casting.setReelMotion(1, 0);
        if (economy.getEquipped().reel.tipo !== "nenhum") audio.reelTick(dt, true, economy.getEquipped().reel.speed);
        break;
      case Phase.REELING:
        fight.update(dtM); // [briga]
        rig.setBriga(fight); // [briga] câmera acompanha a briga
        audio.reelTick(dt, fight.reeling && economy.getEquipped().reel.tipo !== "nenhum", economy.getStats().reelSpeed);
        if (fight.active && fight.phase === "fight") {
          audio.fightLoop(dt, { saindo: fight.saindo, reeling: fight.reeling, speed: economy.getEquipped().reel.speed, tension: fight.tension / 100, tipo: economy.getEquipped().reel.tipo });
        } else audio.fightStop();
        if (fight.active && fight.phase === "fight") {
          casting.aimAtPoint(fight.fishPoint);
        }
        break;
      default:
        break;
    }
  }

  // the fishing line follows whatever is on the end of it
  if (bobber.mode !== "hidden") casting.setLineTarget(bobber.pos, bobber.mode === "flying" ? "voando" : "boia"); // [briga] modo da linha
  else if (fight.active) casting.setLineTarget(fight.lineEnd, fight.phase === "landing" ? "embarque" : "briga"); // [briga] linha vai até a boca do peixe
  else casting.setLineTarget(null);

  rig.setAimYaw(casting.aimYaw);
  rig.update(dt);
  postfx.render(); // [ceu] era renderer.render(scene, camera)
}

// ---------------------------------------------------------------------------
// go
// ---------------------------------------------------------------------------

applySettings();
travelTo(S.world.current, true);
machine.set(Phase.MENU);
if (daMochila) setTimeout(() => hud.toast(`${daMochila} ${daMochila === 1 ? "item da sua mochila liberado" : "itens da sua mochila liberados"} no jogo. Veja na Loja.`, "gold"), 1200);

window.addEventListener("beforeunload", () => saveGame());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) saveGame();
});

tick();
requestAnimationFrame(() => {
  document.getElementById("boot-loader")?.remove();
});

// small debug handle (used by automated smoke tests; harmless in production)
window.TIDELINE = { S, machine, version: 2, economy, tutorial, travelTo, gclock, sky, renderer, scene, casting, rig, fight, bite, bobber, effects, audio, camera }; // [briga] fight/bite/bobber/effects/audio/camera para os testes automáticos
