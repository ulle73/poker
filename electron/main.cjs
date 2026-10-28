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
    if (url !== "poker://app/index.html") e.preventDefault();
  });
  main.webContents.on("will-attach-webview", (e) => e.preventDefault());
  await main.loadURL("poker://app/index.html");
  if (smoke) {
    try {
      await require("./smoke.cjs").run(main);
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
    const dist = path.resolve(__dirname, "../dist");
    protocol.handle("poker", async (request) => {
      try {
        const url = new URL(request.url);
        if (url.hostname !== "app" || !["GET", "HEAD"].includes(request.method))
          return new Response("Forbidden", { status: 403 });
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
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
