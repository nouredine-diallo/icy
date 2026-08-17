// Console -- Phase 1. Un seul travail : poster un message au gateway et
// afficher un accuse de reception. Pas d'historique de conversation cote
// client (P2 du guide) -- chaque envoi est independant.

const $ = (id) => document.getElementById(id);

function loadConfig() {
  return {
    url: localStorage.getItem("icy_gateway_url") || "",
    secret: localStorage.getItem("icy_gateway_secret") || "",
  };
}

function saveConfig(url, secret) {
  localStorage.setItem("icy_gateway_url", url);
  localStorage.setItem("icy_gateway_secret", secret);
}

function addTimelineItem(text, href) {
  const el = document.createElement("div");
  el.className = "item";
  const time = new Date().toLocaleTimeString("fr-FR");
  el.innerHTML = href
    ? `${time} — ${text} : <a href="${href}" target="_blank" rel="noopener">${href}</a>`
    : `${time} — ${text}`;
  $("timeline").prepend(el);
}

function setStatus(text, kind) {
  const el = $("status");
  el.textContent = text;
  el.className = kind || "";
}

window.addEventListener("DOMContentLoaded", () => {
  const cfg = loadConfig();
  $("cfg-url").value = cfg.url;
  $("cfg-secret").value = cfg.secret;

  $("cfg-save").addEventListener("click", () => {
    saveConfig($("cfg-url").value.trim(), $("cfg-secret").value.trim());
    setStatus("Configuration enregistree sur cet appareil.", "ok");
  });

  $("send").addEventListener("click", async () => {
    const { url, secret } = loadConfig();
    const message = $("message").value.trim();
    if (!url || !secret) {
      setStatus("Configure d'abord l'URL et le secret du gateway (ci-dessous).", "err");
      return;
    }
    if (!message) return;

    const btn = $("send");
    btn.disabled = true;
    setStatus("Envoi...", "");

    try {
      const resp = await fetch(url.replace(/\/$/, "") + "/dispatch", {
        method: "POST",
        headers: { "content-type": "application/json", "x-icy-secret": secret },
        body: JSON.stringify({ message }),
      });
      const body = await resp.json().catch(() => ({}));

      if (resp.status === 202) {
        setStatus("Accepte. Le workflow tourne, une PR arrive sous peu.", "ok");
        addTimelineItem("declenchement envoye : " + message);
        $("message").value = "";
      } else {
        setStatus(`Erreur (${resp.status}) : ${body.error || "inconnue"}`, "err");
      }
    } catch (e) {
      setStatus("Impossible de joindre le gateway : " + e.message, "err");
    } finally {
      btn.disabled = false;
    }
  });
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
