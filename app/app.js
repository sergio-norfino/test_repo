import {
  SKIN_INTRO,
  SKIN_SITES,
  TAPE_INTRO,
  TAPE_SITES,
} from "./guides.js";
import {
  availableMethods,
  bestEstimate,
  formatPercent,
  formatRatio,
  methodLabel,
  num,
} from "./formulas.js";

const DB_NAME = "bodytrack";
const DB_VERSION = 1;

const appEl = document.getElementById("app");
const formState = { logId: null };

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("profile")) {
        db.createObjectStore("profile");
      }
      if (!db.objectStoreNames.contains("logs")) {
        const logs = db.createObjectStore("logs", { keyPath: "id" });
        logs.createIndex("measuredAt", "measuredAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getProfile() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("profile", "readonly");
    const req = tx.objectStore("profile").get("me");
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function saveProfile(profile) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("profile", "readwrite");
    tx.objectStore("profile").put(profile, "me");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getLogs() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("logs", "readonly");
    const req = tx.objectStore("logs").getAll();
    req.onsuccess = () => {
      const rows = req.result || [];
      rows.sort((a, b) => String(b.measuredAt).localeCompare(String(a.measuredAt)));
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}

async function getLog(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("logs", "readonly");
    const req = tx.objectStore("logs").get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function saveLog(log) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("logs", "readwrite");
    tx.objectStore("logs").put(log);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteLog(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("logs", "readwrite");
    tx.objectStore("logs").delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function route() {
  const hash = location.hash.replace(/^#/, "") || "home";
  const [name, id] = hash.split("/");
  return { name, id };
}

function go(hash) {
  location.hash = hash;
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function datetimeLocalValue(iso) {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function collectGroup(form, prefix, sites) {
  const out = {};
  for (const site of sites) {
    const raw = form.elements[`${prefix}.${site.id}`]?.value;
    const value = num(raw);
    if (value !== null) out[site.id] = value;
  }
  return out;
}

function introCard(intro, extraImages = []) {
  const extras = extraImages
    .map(
      (src) =>
        `<img src="${src}" alt="" class="guide-thumb" width="120" height="168">`,
    )
    .join("");
  return `
    <section class="card intro-card">
      <div class="intro-copy">
        <h2>${escapeHtml(intro.title)}</h2>
        <ol>${intro.points.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ol>
      </div>
      <div class="intro-art">
        <img src="${intro.image}" alt="" class="guide-thumb" width="140" height="196">
        ${extras}
      </div>
    </section>
  `;
}

function siteField(prefix, site, values) {
  const value = values?.[site.id] ?? "";
  const name = `${prefix}.${site.id}`;
  return `
    <article class="site-card">
      <div class="site-row">
        <label for="${name}">${escapeHtml(site.label)} <span class="unit">${site.unit}</span></label>
        <input id="${name}" name="${name}" type="number" inputmode="decimal" min="0" step="0.1" value="${escapeHtml(value)}" placeholder="0">
      </div>
      <details class="how-to">
        <summary>How to</summary>
        <div class="how-to-body">
          <img src="${site.image}" alt="${escapeHtml(site.label)} placement" class="guide-img">
          <p class="placement">${escapeHtml(site.placement)}</p>
          <ol>${site.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>
          <p class="mistake"><strong>Watch:</strong> ${escapeHtml(site.mistake)}</p>
        </div>
      </details>
    </article>
  `;
}

function chartSvg(points, color, label) {
  const w = 320;
  const h = 120;
  const vals = points.map((p) => p.y).filter((y) => y !== null && Number.isFinite(y));
  if (vals.length < 2) {
    return `<p class="muted">Need at least two ${escapeHtml(label)} logs to chart.</p>`;
  }
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const coords = points
    .map((p, i) => {
      if (p.y === null || !Number.isFinite(p.y)) return null;
      const x = 16 + (i / (points.length - 1)) * (w - 32);
      const y = 16 + (1 - (p.y - min) / span) * (h - 32);
      return `${x},${y}`;
    })
    .filter(Boolean);
  return `
    <svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeHtml(label)} trend">
      <polyline fill="none" stroke="${color}" stroke-width="2.5" points="${coords.join(" ")}" />
      ${coords
        .map((c) => {
          const [x, y] = c.split(",");
          return `<circle cx="${x}" cy="${y}" r="3.2" fill="${color}" />`;
        })
        .join("")}
      <text x="16" y="14" class="chart-label">${escapeHtml(max.toFixed(1))}</text>
      <text x="16" y="${h - 4}" class="chart-label">${escapeHtml(min.toFixed(1))}</text>
    </svg>
  `;
}

function nav(active) {
  const items = [
    ["home", "Home"],
    ["new", "Log"],
    ["history", "History"],
    ["profile", "Profile"],
  ];
  return `
    <nav class="tabbar" aria-label="Main">
      ${items
        .map(
          ([id, label]) => `
        <a href="#${id}" class="${active === id || (active === "entry" && id === "history") ? "active" : ""}">${label}</a>
      `,
        )
        .join("")}
    </nav>
  `;
}

function shell(title, body, active) {
  return `
    <header class="topbar">
      <p class="eyebrow">MeasureLab</p>
      <h1>${escapeHtml(title)}</h1>
    </header>
    <main class="content">${body}</main>
    ${nav(active)}
  `;
}

async function renderHome() {
  const profile = await getProfile();
  const logs = await getLogs();
  if (!profile?.sex || !profile?.age || !profile?.heightCm) {
    appEl.innerHTML = shell(
      "Set up first",
      `<section class="card">
        <p>Add sex, age, and height so body-fat formulas can run. Then log tape and adipometer measures.</p>
        <a class="btn primary" href="#profile">Open profile</a>
      </section>`,
      "home",
    );
    return;
  }
  const latest = logs[0];
  const estimate = latest ? bestEstimate(profile, latest) : null;
  const methods = latest ? availableMethods(profile, latest) : {};
  const chronological = [...logs].reverse();
  const weightPoints = chronological.map((l) => ({ y: num(l.weightKg) }));
  const bfPoints = chronological.map((l) => {
    const est = bestEstimate(profile, l);
    return { y: est ? est.percent : null };
  });

  appEl.innerHTML = shell(
    "Progress",
    `
      <section class="stats">
        <article class="stat">
          <p class="stat-label">Latest weight</p>
          <p class="stat-value">${latest?.weightKg != null ? `${latest.weightKg} kg` : "—"}</p>
        </article>
        <article class="stat">
          <p class="stat-label">Body fat</p>
          <p class="stat-value">${formatPercent(estimate?.percent)}</p>
          <p class="muted">${estimate ? methodLabel(estimate.method) : "Log JP sites or Navy tape"}</p>
        </article>
      </section>
      <section class="card">
        <h2>Weight</h2>
        ${chartSvg(weightPoints, "#c45c26", "weight")}
      </section>
      <section class="card">
        <h2>Body fat %</h2>
        ${chartSvg(bfPoints, "#2f6f5e", "body fat")}
      </section>
      ${
        latest
          ? `<section class="card">
              <h2>Latest extras</h2>
              <p>Waist–hip ratio: <strong>${formatRatio(methods.whr)}</strong></p>
              <p class="muted">${formatDate(latest.measuredAt)}</p>
              <a class="btn" href="#entry/${latest.id}">Open latest log</a>
            </section>`
          : `<section class="card"><p>No logs yet.</p><a class="btn primary" href="#new">New log</a></section>`
      }
    `,
    "home",
  );
}

function logFormHtml(log) {
  const tape = log?.tape || {};
  const skin = log?.skinfolds || {};
  return `
    <form id="log-form" class="stack">
      <section class="card">
        <label for="measuredAt">Date & time</label>
        <input id="measuredAt" name="measuredAt" type="datetime-local" required value="${datetimeLocalValue(log?.measuredAt)}">
        <label for="weightKg">Weight (kg, optional)</label>
        <input id="weightKg" name="weightKg" type="number" inputmode="decimal" min="0" step="0.1" value="${log?.weightKg ?? ""}">
        <label for="notes">Notes</label>
        <textarea id="notes" name="notes" rows="2" placeholder="How the session felt, clothing, etc.">${escapeHtml(log?.notes || "")}</textarea>
      </section>

      ${introCard(TAPE_INTRO)}
      <section class="card">
        <h2>Tape (cm)</h2>
        <p class="muted">Self-taken. Leave blank if you skip a site.</p>
        ${TAPE_SITES.map((s) => siteField("tape", s, tape)).join("")}
      </section>

      ${introCard(SKIN_INTRO, ["guides/map-side.svg", "guides/map-back.svg"])}
      <section class="card">
        <h2>Adipometer (mm)</h2>
        <p class="muted">Self-pinch with a caliper. Skip any site you cannot place reliably.</p>
        ${SKIN_SITES.map((s) => siteField("skin", s, skin)).join("")}
      </section>

      <div id="live-estimate" class="card estimate"></div>
      <button class="btn primary sticky-save" type="submit">${log?.id ? "Update log" : "Save log"}</button>
    </form>
  `;
}

function refreshLiveEstimate(profile, form) {
  const box = document.getElementById("live-estimate");
  if (!box) return;
  const draft = readLogFromForm(form, formState.logId);
  const methods = availableMethods(profile, draft);
  const bits = [];
  if (methods.jp7) bits.push(`JP7 ${formatPercent(methods.jp7.percent)}`);
  if (methods.jp3) bits.push(`JP3 ${formatPercent(methods.jp3.percent)}`);
  if (methods.navy) bits.push(`Navy ${formatPercent(methods.navy.percent)}`);
  if (methods.whr != null) bits.push(`WHR ${formatRatio(methods.whr)}`);
  box.innerHTML = bits.length
    ? `<h2>Available now</h2><p>${bits.join(" · ")}</p>`
    : `<h2>Available now</h2><p class="muted">Fill JP 3-site, 7-site, or Navy tape fields to see estimates.</p>`;
}

function readLogFromForm(form, existingId) {
  const measuredAt = new Date(form.measuredAt.value).toISOString();
  return {
    id: existingId || crypto.randomUUID(),
    measuredAt,
    weightKg: num(form.weightKg.value),
    notes: form.notes.value.trim(),
    tape: collectGroup(form, "tape", TAPE_SITES),
    skinfolds: collectGroup(form, "skin", SKIN_SITES),
  };
}

async function renderNew(existing) {
  const profile = await getProfile();
  formState.logId = existing?.id || null;
  const title = existing ? "Edit log" : "New log";
  appEl.innerHTML = shell(title, logFormHtml(existing), existing ? "entry" : "new");
  const form = document.getElementById("log-form");
  refreshLiveEstimate(profile, form);
  form.addEventListener("input", () => refreshLiveEstimate(profile, form));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const log = readLogFromForm(form, formState.logId);
    await saveLog(log);
    go(`entry/${log.id}`);
  });
}

async function renderHistory() {
  const profile = await getProfile();
  const logs = await getLogs();
  const list = logs.length
    ? logs
        .map((log) => {
          const est = bestEstimate(profile, log);
          return `
            <a class="row-link" href="#entry/${log.id}">
              <span>${escapeHtml(formatDate(log.measuredAt))}</span>
              <span>${log.weightKg != null ? `${log.weightKg} kg` : "—"} · ${formatPercent(est?.percent)}</span>
            </a>
          `;
        })
        .join("")
    : `<p class="muted">No logs yet.</p>`;
  appEl.innerHTML = shell(
    "History",
    `<section class="card list">${list}</section>`,
    "history",
  );
}

async function renderEntry(id) {
  const profile = await getProfile();
  const log = await getLog(id);
  if (!log) {
    appEl.innerHTML = shell("Missing", `<p>That log was not found.</p>`, "history");
    return;
  }
  const methods = availableMethods(profile, log);
  const tapeRows = TAPE_SITES.map((s) => {
    const v = log.tape?.[s.id];
    return v != null ? `<li>${escapeHtml(s.label)}: ${v} cm</li>` : "";
  }).join("");
  const skinRows = SKIN_SITES.map((s) => {
    const v = log.skinfolds?.[s.id];
    return v != null ? `<li>${escapeHtml(s.label)}: ${v} mm</li>` : "";
  }).join("");

  appEl.innerHTML = shell(
    "Log",
    `
      <section class="card">
        <p class="muted">${escapeHtml(formatDate(log.measuredAt))}</p>
        <p>Weight: <strong>${log.weightKg != null ? `${log.weightKg} kg` : "—"}</strong></p>
        ${log.notes ? `<p>${escapeHtml(log.notes)}</p>` : ""}
      </section>
      <section class="card">
        <h2>Estimates</h2>
        <ul class="plain">
          <li>JP7: ${methods.jp7 ? formatPercent(methods.jp7.percent) : "need 7 skinfolds"}</li>
          <li>JP3: ${methods.jp3 ? formatPercent(methods.jp3.percent) : "need 3-site set for your sex"}</li>
          <li>Navy: ${methods.navy ? formatPercent(methods.navy.percent) : "need neck, waist" + (profile?.sex === "female" ? ", hips" : "")}</li>
          <li>Waist–hip: ${formatRatio(methods.whr)}</li>
        </ul>
      </section>
      <section class="card">
        <h2>Tape</h2>
        <ul class="plain">${tapeRows || "<li class='muted'>None</li>"}</ul>
      </section>
      <section class="card">
        <h2>Adipometer</h2>
        <ul class="plain">${skinRows || "<li class='muted'>None</li>"}</ul>
      </section>
      <div class="btn-row">
        <button class="btn" id="edit-log" type="button">Edit</button>
        <button class="btn danger" id="delete-log" type="button">Delete</button>
      </div>
    `,
    "entry",
  );
  document.getElementById("edit-log").addEventListener("click", () => {
    formState.logId = log.id;
    location.hash = "new";
    renderNew(log);
  });
  document.getElementById("delete-log").addEventListener("click", async () => {
    if (confirm("Delete this log?")) {
      await deleteLog(log.id);
      go("history");
    }
  });
}

async function renderProfile() {
  const profile = (await getProfile()) || {};
  appEl.innerHTML = shell(
    "Profile",
    `
      <form id="profile-form" class="stack card">
        <label for="sex">Sex (for equations)</label>
        <select id="sex" name="sex" required>
          <option value="">Select</option>
          <option value="female" ${profile.sex === "female" ? "selected" : ""}>Female</option>
          <option value="male" ${profile.sex === "male" ? "selected" : ""}>Male</option>
        </select>
        <label for="age">Age</label>
        <input id="age" name="age" type="number" min="10" max="90" required value="${profile.age ?? ""}">
        <label for="heightCm">Height (cm)</label>
        <input id="heightCm" name="heightCm" type="number" min="100" max="250" step="0.1" required value="${profile.heightCm ?? ""}">
        <button class="btn primary" type="submit">Save profile</button>
        <p id="profile-status" class="muted"></p>
      </form>
      <section class="card">
        <h2>Backup</h2>
        <p class="muted">Data stays on this phone. Export JSON before changing browsers or clearing Safari data.</p>
        <div class="btn-row">
          <button class="btn" id="export-data" type="button">Export</button>
          <label class="btn file-btn">Import<input id="import-data" type="file" accept="application/json"></label>
        </div>
      </section>
    `,
    "profile",
  );
  document.getElementById("profile-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.target;
    await saveProfile({
      sex: form.sex.value,
      age: num(form.age.value),
      heightCm: num(form.heightCm.value),
    });
    document.getElementById("profile-status").textContent = "Saved on this device.";
  });
  document.getElementById("export-data").addEventListener("click", exportData);
  document.getElementById("import-data").addEventListener("change", importData);
}

async function exportData() {
  const profile = await getProfile();
  const logs = await getLogs();
  const blob = new Blob([JSON.stringify({ profile, logs }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "measurelab-backup.json";
  a.click();
  URL.revokeObjectURL(url);
}

async function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  const data = JSON.parse(text);
  if (data.profile) await saveProfile(data.profile);
  if (Array.isArray(data.logs)) {
    for (const log of data.logs) {
      if (log?.id) await saveLog(log);
    }
  }
  go("home");
  await render();
}

async function render() {
  const { name, id } = route();
  if (name === "new") return renderNew(formState.logId ? await getLog(formState.logId) : null);
  if (name === "history") return renderHistory();
  if (name === "profile") return renderProfile();
  if (name === "entry" && id) return renderEntry(id);
  formState.logId = null;
  return renderHome();
}

window.addEventListener("hashchange", () => {
  if (route().name !== "new") formState.logId = null;
  render();
});

render();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}
