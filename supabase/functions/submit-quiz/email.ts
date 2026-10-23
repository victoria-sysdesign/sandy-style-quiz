// Builds the notification email for Sandy's quiz answers. Plain JS so it can be tested in Node.
const KITS = [
  ["k1", "Direction 1", "Forest and cream"],
  ["k2", "Direction 2", "Navy and parchment"],
  ["k3", "Direction 3", "Charcoal, sand and oxblood"],
];
const SCALES = [["color", "Colors"], ["type", "Lettering"], ["layout", "Layout"], ["overall", "Overall"]];

export const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const rating = (v) => (/^[1-5]$/.test(String(v)) ? Number(v) : null);
const shade = (n) => {
  if (n === null) return ["#f1f1ef", "#8a9096"];
  if (n >= 4) return ["#d9ecde", "#14532d"];
  if (n === 3) return ["#eeeeea", "#33383d"];
  return ["#f6dcd9", "#7f1d1d"];
};
const label = (id, extra = {}) => {
  const hit = KITS.find((k) => k[0] === id);
  if (hit) return `${hit[1]}, ${hit[2]}`;
  return extra[id] ?? "No answer";
};

export function buildEmail(k, final) {
  k = k || {}; final = final || {};
  const pick = label(final.pick, { mix: "A mix of different ones", none: "No preference, you choose" });
  const send = label(final.send, { unsure: "Not sure" });

  const rows = KITS.map(([id, dir, name]) => {
    const a = k[id] || {};
    const vals = SCALES.map(([key]) => rating(a[key]));
    const nums = vals.filter((v) => v !== null);
    const avg = nums.length ? (nums.reduce((s, v) => s + v, 0) / nums.length).toFixed(1) : "-";
    const cells = vals.map((v) => {
      const [bg, fg] = shade(v);
      return `<td style="padding:10px 6px;text-align:center;background:${bg};color:${fg};font-weight:700;font-size:16px;border:2px solid #ffffff">${v ?? "-"}</td>`;
    }).join("");
    return `<tr><td style="padding:10px 12px 10px 0;font-size:14px;line-height:1.3"><b>${esc(dir)}</b><br><span style="color:#586168">${esc(name)}</span></td>${cells}<td style="padding:10px 0 10px 8px;text-align:center;font-size:14px;color:#586168">${avg}</td></tr>`;
  }).join("");

  const head = SCALES.map(([, l]) => `<th style="padding:0 6px 6px;font-size:12px;font-weight:600;color:#586168;text-transform:uppercase;letter-spacing:.04em">${l}</th>`).join("");

  const details = KITS.map(([id, dir, name]) => {
    const a = k[id] || {};
    const words = Array.isArray(a.words) ? a.words.slice(0, 3) : [];
    const chips = words.length
      ? words.map((w) => `<span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border:1px solid #c9ced1;border-radius:999px;font-size:14px">${esc(w)}</span>`).join("")
      : `<span style="color:#8a9096;font-size:14px">No words picked</span>`;
    const change = String(a.change || "").trim();
    return `<div style="padding:14px 0;border-top:1px solid #e3e6e8"><div style="font-size:14px;margin-bottom:8px"><b>${esc(dir)}</b> <span style="color:#586168">${esc(name)}</span></div>${chips}${change ? `<div style="margin-top:6px;font-size:14px;line-height:1.5"><span style="color:#586168">Would change:</span> ${esc(change)}</div>` : ""}</div>`;
  }).join("");

  const extra = (title, text) => String(text || "").trim()
    ? `<div style="padding:14px 0;border-top:1px solid #e3e6e8;font-size:14px;line-height:1.5"><div style="color:#586168;margin-bottom:2px">${title}</div>${esc(String(text).trim())}</div>` : "";

  const html = `<!doctype html><html><body style="margin:0;padding:24px 12px;background:#f3f4f2">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;padding:28px 26px;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#1c2023">
<div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#586168">Website style quiz</div>
<h1 style="margin:4px 0 20px;font-size:24px;line-height:1.25">Sandy finished the quiz</h1>
<div style="background:#e0ecee;border-radius:6px;padding:16px 18px;margin-bottom:24px">
<div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#2d5b63">Her pick today</div>
<div style="font-size:20px;font-weight:700;margin:2px 0 12px">${esc(pick)}</div>
<div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#2d5b63">Most comfortable sending to a colleague</div>
<div style="font-size:16px;font-weight:600;margin-top:2px">${esc(send)}</div></div>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;margin-bottom:8px"><thead><tr><th></th>${head}<th style="padding:0 0 6px 8px;font-size:12px;font-weight:600;color:#586168;text-transform:uppercase;letter-spacing:.04em">Avg</th></tr></thead><tbody>${rows}</tbody></table>
<div style="font-size:12px;color:#8a9096;margin-bottom:18px">Ratings run from 1 (not for me) to 5 (love it).</div>
${details}${extra("If she picked a mix, or wants to add", final.mix)}${extra("Should never feel like", final.never)}
</div></body></html>`;

  const subject = `Sandy's style quiz: ${pick}`;
  return { html, subject };
}
