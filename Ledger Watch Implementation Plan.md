# Ledger Watch — Split the Bill, Onchain

**Concept:** Splitwise, but rendered as a live ops-center dashboard tracking money instead of vessels. Same visual language as a real-time surveillance tool — metric strip, live alert feed, central live view, engine stats panel — repointed at debts between wallets.

---

## 1. Problem / Solution

**Problem:** Group expenses (hackathon dinners, trips, shared costs) end up as vague IOUs nobody settles. No live picture of who owes who, no pressure to close it out.

**Solution:** Create a group, log expenses, everyone sees a live "ops view" of outstanding debts. Settling is one tap — pay your share in MON directly to whoever covered the bill. Full ledger, always current, always visible.

---

## 2. Design System (matches the reference screenshot)

**Palette (sampled from the reference, keep it):**
- `--bg: #f2ecd8` — warm cream background (not black — this is the departure from typical web3 dark-mode, and it reads as "control room," not "app")
- `--ink: #1c1c1c` — primary text, borders, hairlines
- `--panel: #ffffff` — card/panel surfaces on top of the cream base
- `--blue: #3b6fd6` — default/neutral data points (vessel-equivalent = "active debt")
- `--green: #1f9e5c` — LIVE pill, settled/healthy states
- `--orange: #d98a1f` — warning-tier alerts (overdue debts, "spoof/teleport" equivalent)
- `--red: #d6394a` — critical alerts (long-overdue, "dark event" equivalent)
- `--purple: #9b5fd6` / `--magenta: #d63b9e` / `--teal: #1f9e9e` — category tags for expense types (food, transport, lodging, etc.), same role as "trawling/longlining/purse seining" pattern legend in the reference

**Type:** monospace for all data/numbers/labels (IBM Plex Mono) — this is what makes the reference feel like an instrument panel, not a consumer app. A plain grotesk (Inter) for longer body text only. All-caps small labels with letter-spacing for section headers, exactly like "THROUGHPUT," "ACTIVE VESSELS" in the reference.

**Layout (direct structural match to the screenshot):**
```
┌─────────────────────────────────────────────────────────────────┐
│ ● LEDGER WATCH   Group: Hack Dinner Squad   [LIVE FEED] [PAY]    HOME  ●LIVE│
├─────────────────────────────────────────────────────────────────┤
│ TOTAL POT │ ACTIVE DEBTS │ SETTLED │ OVERDUE │ SETTLE RATE │ TXNS │
│  ₹4,200   │      6       │    3    │   Low   │    50.0%    │  12  │
├───────────────┬─────────────────────────────────┬───────────────┤
│ DEBTS (6)     │                                   │ LEDGER STATS  │
│ LOG (12)      │     [live debt-graph view]        │               │
│               │   nodes = people, edges = debts    │ TOTAL POT     │
│ Ali → Sara     │   pulse animation = money flow     │ SETTLED       │
│  ₹800 · food   │   on settlement                    │ PENDING       │
│               │                                     │ AVG TIME      │
│ Zoe → Ali      │                                   │               │
│  ₹500 · cab    │  legend: pending / settled /       │               │
│               │  overdue / partial                  │               │
└───────────────┴─────────────────────────────────┴───────────────┘
```

**The one deliberate swap from the reference:** the map becomes a **live debt graph** — force-directed nodes (people) connected by edges (debts), edge thickness = amount owed, edge color = status (blue pending, green settled, orange/red overdue). This is the correct analog to the reference's map (a live spatial view of the thing being tracked) without faking geography onto data that has none.

---

## 3. Smart Contract Spec

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract LedgerWatch {
    struct Debt {
        address debtor;
        address creditor;
        uint256 amount;   // in wei (MON)
        bool settled;
    }

    Debt[] public debts;

    event DebtLogged(uint256 indexed id, address indexed debtor, address indexed creditor, uint256 amount);
    event DebtSettled(uint256 indexed id, uint256 amountPaid);

    error NotDebtor(uint256 id, address caller);
    error AlreadySettled(uint256 id);
    error WrongAmount(uint256 expected, uint256 sent);

    function logDebt(address creditor, uint256 amount) external returns (uint256 id) {
        id = debts.length;
        debts.push(Debt(msg.sender, creditor, amount, false));
        emit DebtLogged(id, msg.sender, creditor, amount);
    }

    function settle(uint256 id) external payable {
        Debt storage d = debts[id];
        if (msg.sender != d.debtor) revert NotDebtor(id, msg.sender);
        if (d.settled) revert AlreadySettled(id);
        if (msg.value != d.amount) revert WrongAmount(d.amount, msg.value);

        d.settled = true;
        (bool ok, ) = d.creditor.call{value: msg.value}("");
        require(ok, "transfer failed");
        emit DebtSettled(id, msg.value);
    }

    function getDebt(uint256 id) external view returns (Debt memory) {
        return debts[id];
    }
}
```

Straightforward: log a debt, settle it with an exact-amount payment that forwards directly to the creditor. No pooled custody, no admin key — money moves wallet to wallet, contract just keeps the ledger.

---

## 4. Tech Stack

- **Contract:** Solidity ^0.8.24, Foundry, Monad Testnet
- **Frontend:** Next.js + TypeScript + Tailwind (tokens from section 2)
- **Graph view:** `react-force-graph` or a lightweight custom D3 force simulation on canvas — nodes/edges as described above, with a settlement pulse animation (particle traveling along the edge) triggered by the `DebtSettled` event
- **Web3:** wagmi + viem + RainbowKit/ConnectKit

---

## 5. Screens

**5.1 Dashboard (`/group/[id]`)** — the whole demo lives here
- Top metric strip (pot total, active/settled counts, overdue status, settle rate, tx count) — all real, computed from contract state
- Left panel: DEBTS tab (list of open debts, click one to pay) / LOG tab (full history)
- Center: live force-graph of the group, updates in real time as debts are logged/settled
- Right panel: ledger stats card, same visual pattern as the reference's "ENGINE METRICS"

**5.2 New Expense (modal, not a separate page)**
- Who paid, amount, split between who, category tag (drives edge color/legend) — submits `logDebt()` calls for each ower

**5.3 Pay (inline, from clicking a debt)**
- Wallet prompts, calls `settle(id)` with exact MON value, edge on the graph animates and flips to green on confirm

---

## 6. Build Order

1. Contract + Foundry tests (log succeeds, settle transfers correctly, wrong-amount reverts, double-settle reverts). Deploy to testnet.
2. Design tokens + layout shell matching section 2 exactly — get the instrument-panel feel right before wiring data.
3. `logDebt` flow — new expense modal → contract write → appears in DEBTS list. Verify end-to-end before touching the graph.
4. Debt list + metric strip — pull real contract state, compute the six top metrics live.
5. Force-graph view — nodes from participants, edges from open/settled debts, pulse animation on `DebtSettled` event.
6. Settle flow — click a debt, pay exact amount, watch the graph update live.
7. Record demo.

---

## 7. Demo Script (under 3 minutes)

1. (0:00–0:20) Show the empty dashboard, log 3–4 real expenses from an actual group (name it after your team) — metric strip populates live.
2. (0:20–0:50) Point at the graph — nodes and edges forming in real time, exactly matching what's in the DEBTS list.
3. (0:50–1:20) Settle one debt live — wallet prompt, confirm, edge pulses and flips green, SETTLED count ticks up.
4. (1:20–1:50) Try settling with the wrong amount — show the revert, prove it's not just UI validation.
5. (1:50–2:10) Close: "Built for tonight's dinner bill, works for anything."

---

## 8. What NOT to add

- No pooled/custodial wallet — every settlement is a direct wallet-to-wallet transfer, contract only tracks state
- No fake nodes/edges on the graph before real debts exist
- No extra colors beyond the palette in section 2 — category tags reuse the existing hues, don't introduce new ones
