// Receives Sandy's quiz answers, stores them, and emails them to Victoria through Resend.
import { createClient } from "jsr:@supabase/supabase-js@2";

const TO = Deno.env.get("NOTIFY_TO") ?? "victoriaclaire.ca@gmail.com";
const FROM = Deno.env.get("NOTIFY_FROM") ?? "Style Quiz <onboarding@resend.dev>";
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const MAX_BYTES = 20_000;
const MAX_PER_HOUR = 20;

const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const raw = await req.text();
  if (raw.length > MAX_BYTES) return json(413, { error: "too_large" });

  let body: any;
  try { body = JSON.parse(raw); } catch { return json(400, { error: "bad_json" }); }

  const summary = typeof body?.summary === "string" ? body.summary.slice(0, 8000) : "";
  const k = body?.k, final = body?.final;
  if (!summary || typeof k !== "object" || k === null || typeof final !== "object" || final === null) {
    return json(400, { error: "bad_shape" });
  }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await db.from("style_quiz_responses")
    .select("id", { count: "exact", head: true }).gte("created_at", since);
  if ((count ?? 0) >= MAX_PER_HOUR) return json(429, { error: "rate_limited" });

  const { data: row, error } = await db.from("style_quiz_responses")
    .insert({ answers: { k, final }, summary }).select("id").single();
  if (error) return json(500, { error: "save_failed" });

  const key = Deno.env.get("RESEND_API_KEY");
  let emailed = false;
  if (key) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        subject: "Sandy finished the website style quiz",
        text: summary,
        html: `<pre style="font-family:ui-monospace,Menlo,monospace;font-size:14px;line-height:1.5;white-space:pre-wrap">${esc(summary)}</pre>`,
      }),
    });
    emailed = res.ok;
    if (emailed) await db.from("style_quiz_responses").update({ emailed: true }).eq("id", row.id);
  }
  // The answers are saved either way, so tell the page it worked.
  return json(200, { ok: true, emailed });
});
