/**
 * API smoke test for Team Lunch (mock dd-cli).
 * Usage: npm run e2e
 * Optional: E2E_BASE=http://localhost:3001 npm run e2e
 */
const base = process.env.E2E_BASE ?? "http://localhost:3001";

async function j(method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  console.log(`E2E against ${base}`);
  await j("POST", "/api/session", { action: "reset" });
  const health = await j("GET", "/api/dd/health");
  if (health.mode !== "mock" && health.mode !== "cli") {
    throw new Error("bad health");
  }
  const search = await j("POST", "/api/dd/search", {
    query: "lunch",
    openVoting: true,
    locationMode: "org",
  });
  if (!search.candidates?.length) throw new Error("no candidates");
  const cid = search.candidates[0].id;
  await j("POST", "/api/session", { action: "vote", candidateId: cid });
  await j("POST", "/api/session", { action: "lock" });
  await j("POST", "/api/session", { action: "join" });
  const menu = await j("GET", "/api/dd/menu");
  const item = menu.menu.items.find((i) => i.available);
  if (!item) throw new Error("no menu item");
  await j("POST", "/api/session", {
    action: "add_item",
    ddItemId: item.id,
    name: item.name,
    unitPriceCents: item.priceCents,
    quantity: 1,
    modifiers: [],
  });
  await j("POST", "/api/dd/preview", {});
  const paid = await j("POST", "/api/session", { action: "mark_paid" });
  if (paid.session.status !== "funded") throw new Error("not funded");
  const co = await j("POST", "/api/dd/checkout");
  if (!co.order?.orderId) throw new Error("no order");
  const tr = await j("GET", `/api/dd/track?orderId=${co.order.orderId}`);
  if (!tr.tracking?.status) throw new Error("no tracking");
  console.log("E2E_OK", {
    order: co.order.orderId,
    tracking: tr.tracking.status,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
