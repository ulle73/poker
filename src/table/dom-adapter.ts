import { normalizeCards } from "../core/cards";
import type { HistoryEntry, TableSnapshot } from "../core/types";

function visible(el: Element): boolean {
  for (let e: Element | null = el; e; e = e.parentElement) {
    const style = getComputedStyle(e);
    if (
      e.hasAttribute("hidden") ||
      e.getAttribute("aria-hidden") === "true" ||
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.visibility === "collapse"
    )
      return false;
  }
  return true;
}
export function readTableDom(doc: Document): TableSnapshot | null {
  const root = doc.querySelector<HTMLElement>("[data-poker-table]");
  if (!root) return null;
  const num = (v: string | undefined | null) => {
    if (v == null || v.trim() === "" || !Number.isFinite(Number(v)))
      throw new Error("Bordet innehåller ett ogiltigt tal.");
    return Number(v);
  };
  const cards = (selector: string) =>
    normalizeCards(
      [...root.querySelectorAll(`${selector} [data-card]`)]
        .filter(visible)
        .map((e) => e.getAttribute("data-card")!),
    );
  const history: HistoryEntry[] = [
    ...root.querySelectorAll<HTMLElement>("[data-history] li"),
  ].map((e) => ({
    player: num(e.dataset.player),
    street: e.dataset.street!,
    action: e.dataset.action!,
    amount: num(e.dataset.amount),
    description: e.textContent ?? "",
  }));
  return {
    version: 1,
    source: "local-training-dom",
    token: root.dataset.token!,
    handId: root.dataset.handId!,
    revision: num(root.dataset.revision),
    configKey: root.dataset.configKey!,
    nodeId: num(root.dataset.nodeId),
    hero: num(root.dataset.hero),
    heroCards: cards("[data-hole]"),
    board: cards("[data-board]"),
    pot: num(root.querySelector("[data-pot]")?.textContent),
    stacks: [0, 1].map((p) =>
      num(root.querySelector(`[data-stack="${p}"]`)?.textContent),
    ),
    street: root.dataset.street!,
    history,
    capturedAt: Date.now(),
  };
}
export function observeTable(
  doc: Document,
  publish: (snapshot: TableSnapshot | null, error?: string) => void,
): () => void {
  let timeout: ReturnType<typeof setTimeout>;
  const read = () => {
    try {
      publish(readTableDom(doc));
    } catch (e) {
      publish(null, String(e));
    }
  };
  const observer = new MutationObserver(() => {
    clearTimeout(timeout);
    timeout = setTimeout(read, 25);
  });
  observer.observe(doc.body, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  });
  read();
  const heartbeat = setInterval(read, 1000);
  return () => {
    observer.disconnect();
    clearTimeout(timeout);
    clearInterval(heartbeat);
  };
}
