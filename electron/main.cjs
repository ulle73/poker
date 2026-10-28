const {
  app,
  BrowserWindow,
  protocol,
  session,
  Menu,
  dialog,
} = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");

const smoke = process.argv.includes("--smoke-test");
if (smoke)
  app.setPath(
    "userData",
    path.join(
      process.env.TEMP || app.getPath("temp"),
      "poker-advisor-smoke-profile",
    ),
  );
app.setName("Poker GTO Advisor");
protocol.registerSchemesAsPrivileged([
  {
    scheme: "poker",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      codeCache: true,
    },
  },
]);
const CSP =
  "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'";
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".wasm": "application/wasm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".png": "image/png",
  ".ico": "image/x-icon",
};
let main;
let liveBridge;
let liveError;
async function createWindow() {
  main = new BrowserWindow({
    width: 1440,
    height: 1000,
    minWidth: 850,
    minHeight: 650,
    backgroundColor: "#080909",
    title: "Poker GTO Advisor",
    autoHideMenuBar: true,
    show: !smoke,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  });
  main.removeMenu();
  main.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  main.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith("poker://app/index.html")) e.preventDefault();
  });
  main.webContents.on("will-attach-webview", (e) => e.preventDefault());
  await main.loadURL(
    "poker://app/index.html" +
      (process.argv.includes("--live") ? "?view=live" : ""),
  );
  if (process.argv.includes("--live-proof")) {
    let proofAttempts = 0;
    const proofTimer = setInterval(async () => {
      const state = liveBridge?.state();
      if (!state?.snapshot || Date.now() - state.receivedAt > 3000) return;
      try {
        const output = path.resolve("artifacts");
        await fs.mkdir(output, { recursive: true });
        await fs.writeFile(
          path.join(output, "live-current.png"),
          (await main.webContents.capturePage()).toPNG(),
        );
        console.log(
          "LIVE_PROOF",
          JSON.stringify({
            received: true,
            sequence: state.snapshot.sequence,
            valid: state.snapshot.valid,
            street: state.snapshot.street,
            players: state.snapshot.players.length,
          }),
        );
        clearInterval(proofTimer);
      } catch (error) {
        if (++proofAttempts >= 3) clearInterval(proofTimer);
        console.warn("Live proof capture unavailable", String(error));
      }
    }, 1500);
    proofTimer.unref();
  }
  if (smoke) {
    try {
      await require("./smoke.cjs").run(main, liveBridge);
      app.exit(0);
    } catch (e) {
      console.error(e);
      app.exit(1);
    }
  }
}
app
  .whenReady()
  .then(async () => {
    try {
      const savedPair = await fs
        .readFile(
          path.join(app.getPath("userData"), "live-connection.json"),
          "utf8",
        )
        .then(JSON.parse)
        .catch(() => null);
      liveBridge = await require("./live-bridge.cjs").createLiveBridge({
        port: smoke ? 0 : 47832,
        token: /^[a-f0-9]{48}$/.test(savedPair?.token ?? "")
          ? savedPair.token
          : undefined,
      });
      await fs.mkdir(app.getPath("userData"), { recursive: true });
      await fs.writeFile(
        path.join(app.getPath("userData"), "live-connection.json"),
        JSON.stringify({
          endpoint: liveBridge.state().endpoint,
          token: liveBridge.token,
        }),
      );
    } catch (e) {
      liveError = `Liveanslutningen kunde inte startas: ${e.code || e.message}`;
    }
    const dist = path.resolve(__dirname, "../dist");
    protocol.handle("poker", async (request) => {
      try {
        const url = new URL(request.url);
        if (url.hostname !== "app" || !["GET", "HEAD"].includes(request.method))
          return new Response("Forbidden", { status: 403 });
        if (url.pathname === "/live-state")
          return new Response(
            JSON.stringify(
              liveBridge?.state() ?? {
                available: false,
                snapshot: null,
                history: [],
                error: liveError,
              },
            ),
            {
              headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
                "Content-Security-Policy": CSP,
              },
            },
          );
        const requested = decodeURIComponent(
          url.pathname === "/" ? "/index.html" : url.pathname,
        );
        const file = path.resolve(dist, "." + requested),
          relative = path.relative(dist, file);
        if (relative.startsWith("..") || path.isAbsolute(relative))
          return new Response("Forbidden", { status: 403 });
        const bytes = await fs.readFile(file);
        return new Response(request.method === "HEAD" ? null : bytes, {
          headers: {
            "Content-Type":
              mime[path.extname(file)] || "application/octet-stream",
            "Content-Security-Policy": CSP,
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-cache",
          },
        });
      } catch {
        return new Response("Not found", { status: 404 });
      }
    });
    session.defaultSession.setPermissionRequestHandler(
      (_wc, _permission, callback) => callback(false),
    );
    session.defaultSession.setPermissionCheckHandler(() => false);
    // The desktop product has no reason to contact any remote server.
    session.defaultSession.webRequest.onBeforeRequest((details, callback) =>
      callback({
        cancel: !["poker:", "blob:", "data:", "devtools:"].includes(
          new URL(details.url).protocol,
        ),
      }),
    );
    session.defaultSession.on("will-download", (_event, item) => {
      if (!smoke)
        item.setSaveDialogOptions({
          title: "Spara pokerstudie eller session",
          defaultPath: path.join(app.getPath("documents"), item.getFilename()),
        });
    });
    Menu.setApplicationMenu(null);
    await createWindow();
  })
  .catch((error) => {
    console.error(error);
    if (!smoke)
      dialog.showErrorBox("Poker GTO Advisor kunde inte starta", String(error));
    app.exit(1);
  });
app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => {
  liveBridge?.close();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
