// Wait-for-bite phase: dt-driven timers (pause-safe), teaser nibbles, the real
// bite, and the short hook reaction window. The fish is rolled at bite time so
// the time of day at that moment matters.

import { CONFIG } from "../data/config.js";
import { events } from "../state/gameState.js";
import { rollFish, rollBiteWait } from "../fish/spawning.js";
import { chance, randRange } from "../utils/utils.js";
import { avaliar } from "./rules.js";

export class BiteSystem {
  /**
   * @param {Function} getEnv returns { location, hours, weather, bait }
   * @param {Bobber} bobber
   */
  constructor(getEnv, bobber) {
    this.getEnv = getEnv;
    this.bobber = bobber;
    this.state = "idle"; // idle | waiting | window
    this.zone = "shallow";
    this.t = 0;
    this.wait = 0;
    this.windowT = 0;
    this.fish = null;
    this.nibbles = [];
    this.nibbleEnd = 0;
  }

  /** modo: "boia" | "fundo" | "artificial" (com artificial o peixe só ataca a isca em movimento). */
  begin(zone, modo = this.modo || "boia") {
    const env = this.getEnv();
    this.zone = zone;
    this.modo = modo;
    this.atividade = 1;
    this.wait = rollBiteWait({ ...env, zone }) * (modo === "artificial" ? 0.5 : 1);
    this.t = 0;
    this.fish = null;
    this.state = "waiting";
    this.nibbles = [];
    this.nibbleEnd = 0;
    if (chance(CONFIG.bite.nibbleChance)) this.nibbles.push(this.wait * randRange(0.4, 0.55));
    if (chance(0.35)) this.nibbles.push(this.wait * randRange(0.7, 0.85));
  }

  cancel() {
    this.state = "idle";
    this.fish = null;
    this.bobber.setDip(0);
  }

  /** Player pressed during the window. Returns the hooked fish or null. */
  hookAttempt() {
    if (this.state !== "window") return null;
    const fish = this.fish;
    this.state = "idle";
    this.fish = null;
    events.emit("bite:hooked", { fish });
    return fish;
  }

  /** Isca artificial: quanto ela está trabalhando (0 parada ... 1 nadando ou levando toques). */
  setAtividade(a) {
    this.atividade = a;
  }

  update(dt) {
    if (this.state === "waiting") {
      // isca artificial parada quase não recebe ataque; na boia e no fundo o tempo corre normal
      this.t += dt * (this.modo === "artificial" ? 0.15 + 0.85 * this.atividade : 1);

      if (this.nibbleEnd > 0 && this.t >= this.nibbleEnd) {
        this.bobber.setDip(0);
        this.nibbleEnd = 0;
      }
      if (this.nibbles.length && this.t >= this.nibbles[0]) {
        this.nibbles.shift();
        this.bobber.setDip(0.13);
        this.nibbleEnd = this.t + 0.35;
        events.emit("bite:nibble", { modo: this.modo });
      }

      if (this.t >= this.wait) {
        const env = this.getEnv();
        this.fish = rollFish({ ...env, zone: this.zone });
        if (!this.fish) {
          // ninguém se interessou pela isca aqui: o tempo de espera recomeça
          this.begin(this.zone, this.modo);
          return;
        }
        // anzol grande demais para a boca do peixe: ele belisca, rouba a isca e vai embora
        const av = !this.fish.tutorial && env.eq ? avaliar(this.fish.speciesId, env.eq, this.fish.sizeNorm) : null;
        if (av && av.anzolGrande && chance(0.6)) {
          const fish = this.fish;
          this.begin(this.zone);
          this.bobber.setDip(0.2);
          this.nibbleEnd = 0.4;
          events.emit("bite:stolen", { fish, reason: av.problemas.find((p) => p.startsWith("Anzol")) });
          return;
        }
        this.windowT = this.fish.hookWindow * (this.modo === "artificial" ? 0.85 : 1);
        this.state = "window";
        this.bobber.setDip(0.42);
        events.emit("bite:start", { fish: this.fish, modo: this.modo });
      }
    } else if (this.state === "window") {
      this.windowT -= dt;
      if (this.windowT <= 0) {
        const fish = this.fish;
        this.fish = null;
        this.bobber.setDip(0);
        // fish swims off, the wait restarts automatically
        this.begin(this.zone);
        events.emit("bite:missed", { fish });
      }
    }
  }
}
