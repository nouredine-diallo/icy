// ICY gateway -- Phase 1 ("boucle nue", zero LLM).
//
// Seul travail de ce Worker : recevoir un declenchement (PWA/telephone),
// repondre sous 300ms (P1 du guide: accuse de reception immediat, jamais
// une requete utilisateur qui attend un modele), et transmettre a GitHub
// Actions via repository_dispatch. Aucune logique metier ici -- c'est le
// workflow bootstrap.yml qui ecrit le fichier et ouvre la PR.

const GITHUB_OWNER = "nouredine-diallo";
const GITHUB_REPO = "icy";
const DISPATCH_EVENT_TYPE = "icy_bootstrap_test";

function cors(resp) {
  resp.headers.set("access-control-allow-origin", "*");
  resp.headers.set("access-control-allow-headers", "content-type, x-icy-secret");
  resp.headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
  return resp;
}

function json(body, status = 200) {
  return cors(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    })
  );
}

async function handleDispatch(request, env) {
  if (!env.ICY_SHARED_SECRET || request.headers.get("x-icy-secret") !== env.ICY_SHARED_SECRET) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!env.ICY_GITHUB_TOKEN) {
    // Attendu tant que TODO_MANUEL.md #4 n'est pas fait -- erreur claire,
    // pas un echec silencieux.
    return json({ error: "ICY_GITHUB_TOKEN not configured on the Worker yet" }, 503);
  }

  let payload = {};
  try {
    payload = await request.json();
  } catch {
    // corps vide tolere: message par defaut
  }

  const ghResp = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.ICY_GITHUB_TOKEN}`,
        accept: "application/vnd.github+json",
        "content-type": "application/json",
        "user-agent": "ICY-gateway/1.0",
      },
      body: JSON.stringify({
        event_type: DISPATCH_EVENT_TYPE,
        client_payload: { message: payload.message || "depuis la PWA ICY" },
      }),
    }
  );

  if (ghResp.status !== 204) {
    const detail = await ghResp.text();
    return json({ error: "github dispatch failed", status: ghResp.status, detail }, 502);
  }

  return json({ accepted: true, note: "workflow declenche, PR a venir sous ~1-2 min" }, 202);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return cors(new Response(null, { status: 204 }));
    }
    if (url.pathname === "/health") {
      return json({ status: "ok" });
    }
    if (url.pathname === "/dispatch" && request.method === "POST") {
      return handleDispatch(request, env);
    }
    return json({ error: "not found" }, 404);
  },
};
