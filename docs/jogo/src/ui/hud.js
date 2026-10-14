// HUD: top bars, phase prompt, power meter, reel-fight overlay, bite
// indicator, zone hint, toasts. Mostly event-driven off the shared bus.

import { S, events, Phase } from "../state/gameState.js";
import { xpToNext, getEquipped, inventoryValue, modoDono } from "../economy/economy.js";
import { bomPara, compat } from "../gameplay/rules.js";
import { hookTxt } from "../data/gearData.js";
import { LOCATION_BY_ID } from "../data/locationData.js";
import { formatMoney, hourToClock, clamp } from "../utils/utils.js";

const $ = (id) => document.getElementById(id);

const PROMPTS = {
  [Phase.IDLE]: "Mire com o <b>mouse</b> e segure o <b>clique</b> ou <b>espaço</b> para carregar o arremesso",
  [Phase.CHARGING]: "Solte para <b>arremessar!</b>",
  [Phase.FLYING]: "Belo arremesso...",
  [Phase.WAITING]: "Espere a mordida... <b>segure o clique</b> ou aperte <b>R</b> para recolher",
  [Phase.BITE]: "FISGA! CLIQUE AGORA!",
  [Phase.REELING]: "<b>Segure o clique</b> para puxar e solte nas <b style=\"color:var(--danger)\">arrancadas!</b>",
  [Phase.CATCH]: "",
  [Phase.RETRIEVING]: "Recolhendo a linha...",
};

export class HUD {
  constructor() {
    this.root = $("hud");
    this.money = $("hud-money");
    this.level = $("hud-level");
    this.xpFill = $("hud-xpfill");
    this.xpText = $("hud-xptext");
    this.clock = $("hud-clock");
    this.seg = $("hud-seg");
    this.weather = $("hud-weather");
    this.loc = $("hud-loc");
    this.kitRows = $("kit-rows");
    this.kitBom = $("kit-bom");
    this.bag = $("hud-bag");
    this.prompt = $("hud-prompt");
    this.zone = $("hud-zone");
    this.powerWrap = $("power-wrap");
    this.powerFill = $("power-fill");
    this.reelWrap = $("reel-wrap");
    this.fightName = $("fight-name");
    this.fightStars = $("fight-stars");
    this.surgeBanner = $("surge-banner");
    this.tensionFill = $("tension-fill");
    this.progressFill = $("progress-fill");
    this.bite = $("bite-indicator");
    this.toasts = $("toasts");
    this.vignette = $("vignette");
    this.buttons = [$("btn-map"), $("btn-shop"), $("btn-journal")];

    this.bindEvents();
  }

  bindEvents() {
    events.on("money", () => {
      this.updateMoney();
      this.money.classList.remove("pulse");
      void this.money.offsetWidth; // restart the pulse animation
      this.money.classList.add("pulse");
    });
    events.on("xp", () => this.updateXp());
    events.on("levelup", ({ level, unlocks }) => {
      this.toast(`Pescador nível ${level}!`, "gold");
      for (const u of unlocks) this.toast(u, "success");
    });
    events.on("journal:new", () => this.toast("Espécie nova no Diário!", "success"));
    events.on("inventory", () => this.updateBag());
    events.on("gear", () => this.updateGear());
    events.on("location", () => this.updateGear());
    events.on("weather", ({ weather }) => {
      this.weather.textContent = weather === "cloudy" ? "Nublado" : "Limpo";
    });
    events.on("toast", ({ msg, kind }) => this.toast(msg, kind));
    events.on("phase", ({ to }) => {
      this.setPrompt(PROMPTS[to] ?? "");
      this.prompt.classList.toggle("urgent", to === Phase.BITE);
      const idle = to === Phase.IDLE;
      for (const b of this.buttons) b.disabled = !idle;
      if (to === Phase.IDLE) this.setZone(null);
      if (to !== Phase.CHARGING) this.showPower(false);
      if (to !== Phase.REELING) this.showReel(false);
      if (to !== Phase.BITE) this.positionBite(null);
    });
  }

  show() {
    this.root.classList.remove("hidden");
    this.refreshAll();
  }

  hide() {
    this.root.classList.add("hidden");
    this.vignette.classList.remove("tension-danger");
  }

  refreshAll() {
    this.updateMoney();
    this.updateXp();
    this.updateGear();
    this.updateBag();
    this.updateLocation();
    this.weather.textContent = S.world.weather === "cloudy" ? "Nublado" : "Limpo";
  }

  updateMoney() {
    this.money.textContent = modoDono() ? "R$ ∞ (dono)" : formatMoney(S.profile.money);
  }

  updateXp() {
    const next = xpToNext(S.profile.level);
    this.level.textContent = `Lv ${S.profile.level}`;
    this.xpFill.style.width = `${clamp((S.profile.xp / next) * 100, 0, 100)}%`;
    this.xpText.textContent = `${S.profile.xp} / ${next} XP`;
  }

  updateGear() {
    const eq = getEquipped();
    const curto = (n) => n.replace(/ · .*/, "");
    this.kitRows.innerHTML = [
      ["Vara", curto(eq.rod.name)],
      ["Molinete", eq.reel.tipo === "nenhum" ? "nenhum" : curto(eq.reel.name)],
      ["Linha", `${eq.line.tipo === "multi" ? "multi" : "mono"} ${eq.line.lb} lb`],
      ["Anzol", `${hookTxt(eq.term.hook)}${eq.term.aco ? " + aço" : ""}`],
      ["Isca", eq.bait.name.replace("Artificial: ", "")],
    ].map(([k, v]) => `<span><i>${k}</i>${v}</span>`).join("");
    const erro = compat(eq);
    const loc = LOCATION_BY_ID[S.world.current];
    const bons = loc ? bomPara(eq, loc) : [];
    this.kitBom.className = `kit-bom${erro || !bons.length ? " ruim" : ""}`;
    this.kitBom.textContent = erro ? erro : bons.length ? `Pega bem aqui: ${bons.join(", ")}` : "Esse conjunto não combina com os peixes daqui. Abra a Loja e veja \"Indicado para\".";
  }

  updateBag() {
    const n = S.inventory.length;
    this.bag.textContent = n === 0 ? "Samburá: vazio" : `Samburá: ${n} peixe${n === 1 ? "" : "s"} · ${formatMoney(inventoryValue())}`;
  }

  updateLocation() {
    this.loc.textContent = LOCATION_BY_ID[S.world.current]?.name ?? "";
  }

  setClock(hours, segment) {
    this.clock.textContent = hourToClock(hours);
    const label = ({ dawn: "Amanhecer", day: "Dia", dusk: "Entardecer", night: "Noite" })[segment] || segment;
    if (this.seg.textContent !== label) {
      this.seg.textContent = label;
      this.seg.className = `seg-chip seg-${segment}`;
    }
  }

  setPrompt(html) {
    this.prompt.innerHTML = html;
    this.prompt.classList.toggle("hidden", !html);
  }

  setZone(text) {
    if (!text) {
      this.zone.classList.add("hidden");
    } else {
      this.zone.textContent = text;
      this.zone.classList.remove("hidden");
    }
  }

  showPower(visible) {
    this.powerWrap.classList.toggle("hidden", !visible);
  }

  setPower(p) {
    this.powerFill.style.width = `${Math.round(p * 100)}%`;
  }

  showReel(visible, fish = null) {
    this.reelWrap.classList.toggle("hidden", !visible);
    if (visible && fish) {
      this.fightName.textContent = "Tem peixe no anzol...";
      this.fightStars.textContent = "★".repeat(fish.stars) + "☆".repeat(5 - fish.stars);
      this.surgeBanner.classList.add("hidden");
      this.tensionFill.style.width = "18%";
      this.progressFill.style.width = "8%";
    }
    if (!visible) this.vignette.classList.remove("tension-danger");
  }

  updateFight({ tension, progress, surge, landing }) {
    if (landing) {
      this.reelWrap.classList.add("hidden");
      this.vignette.classList.remove("tension-danger");
      this.setPrompt("Pegou!");
      return;
    }
    this.tensionFill.style.width = `${tension}%`;
    this.progressFill.style.width = `${progress}%`;
    this.vignette.classList.toggle("tension-danger", tension > 75);
    if (surge === "telegraph") {
      this.surgeBanner.textContent = "VAI DAR ARRANCADA...";
      this.surgeBanner.classList.remove("hidden");
      this.surgeBanner.classList.add("telegraph");
    } else if (surge === "active") {
      this.surgeBanner.textContent = "ARRANCADA — SOLTE!";
      this.surgeBanner.classList.remove("hidden", "telegraph");
    } else {
      this.surgeBanner.classList.add("hidden");
    }
  }

  /** Position the "!" over the bobber; pass null to hide. */
  positionBite(screenPos) {
    if (!screenPos) {
      this.bite.classList.add("hidden");
      return;
    }
    this.bite.classList.remove("hidden");
    this.bite.style.left = `${screenPos.x}px`;
    this.bite.style.top = `${screenPos.y}px`;
  }

  toast(msg, kind = "info") {
    const el = document.createElement("div");
    el.className = `toast${kind && kind !== "info" ? ` toast-${kind}` : ""}`;
    el.textContent = msg;
    this.toasts.appendChild(el);
    setTimeout(() => el.remove(), 3600);
    while (this.toasts.children.length > 4) this.toasts.firstChild.remove();
  }

  shake() {
    const app = document.getElementById("app");
    app.classList.remove("shake");
    void app.offsetWidth;
    app.classList.add("shake");
  }
}
