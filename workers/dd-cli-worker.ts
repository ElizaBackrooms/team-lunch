import { getDoorDashCli } from "../src/lib/dd-cli/index";
import {
  loadMenuForJoin,
  placeConsolidatedOrder,
  seedCandidatesFromSearch,
  trackOrder,
} from "../src/lib/dd-cli/product";
import { DEFAULT_ORG_LOCATION } from "../src/lib/location";

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const dd = getDoorDashCli();

  switch (cmd) {
    case "health":
      console.log(JSON.stringify(await dd.health(), null, 2));
      return;
    case "search": {
      const query = rest[0] ?? "lunch";
      const stores = await seedCandidatesFromSearch({
        sessionId: "worker",
        query,
        location: DEFAULT_ORG_LOCATION,
      });
      console.log(JSON.stringify(stores, null, 2));
      return;
    }
    case "menu": {
      const storeId = rest[0];
      if (!storeId) throw new Error("usage: menu <storeId>");
      console.log(JSON.stringify(await loadMenuForJoin(storeId), null, 2));
      return;
    }
    case "track": {
      const orderId = rest[0];
      if (!orderId) throw new Error("usage: track <orderId>");
      console.log(JSON.stringify(await trackOrder(orderId), null, 2));
      return;
    }
    case "history":
      console.log(JSON.stringify(await dd.listOrderHistory(10), null, 2));
      return;
    case "place": {
      const result = await placeConsolidatedOrder({
        ddStoreId: rest[0] ?? "dd_chipotle_01",
        tipCents: 500,
        items: [
          {
            id: "1",
            participantId: "p1",
            sessionId: "s1",
            ddItemId: "ch_bowl_build",
            name: "Build Your Bowl",
            quantity: 2,
            unitPriceCents: 1095,
            modifiers: [],
            notes: null,
          },
        ],
      });
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    default:
      console.log(`DoorDash worker (mock unless DD_CLI_USE_REAL=1)

  health
  search [query]
  menu <storeId>
  place [storeId]
  track <orderId>
  history`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
