// Server-side password check for member-only games/tools. The correct
// password lives ONLY as a Cloudflare Pages environment variable (set in
// the Cloudflare dashboard, never committed to this repo) — it is never
// sent to the browser, so unlike a client-side check this can actually
// keep people out. See DOCUMENTATION.md, "Mitgliedschaft/Login" for why
// a client-side/static-file password list was rejected instead.
//
// Add a new game by adding an entry to GAMES below and setting the
// matching env var (GAME_PASSWORD_<KEY>) in the Cloudflare Pages project
// settings (Settings -> Environment variables). Keep the tool URL itself
// unlisted (not linked from any public page) so it isn't guessable
// without going through this check.

const GAMES = {
  morphology: {
    envVar: "GAME_PASSWORD_MORPHOLOGY",
    url: "/assets/work/games/morphology/tool/"
  }
};

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin") || "";
  const host = new URL(request.url).origin;
  if (origin && origin !== host) {
    return new Response(JSON.stringify({ ok: false, error: "forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "bad json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const game = String(payload?.game || "").trim();
  const password = String(payload?.password || "");

  const entry = GAMES[game];
  if (!entry) {
    return new Response(JSON.stringify({ ok: false, error: "unknown game" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }

  const expected = env[entry.envVar] || "";
  // No password configured yet for this game -> nobody can pass, not "open".
  if (!expected || password !== expected) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ ok: true, url: entry.url }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
