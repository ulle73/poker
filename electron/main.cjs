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
const measure = process.argv.includes("--measure-decisions");
const openStudy = process.argv.includes("--study");
if (smoke || measure)
  app.setPath(
    "userData",
    path.join(
      process.env.TEMP || app.getPath("temp"),
      measure ? "poker-advisor-measure-profile" : "poker-advisor-smoke-profile",
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
let shortdeck;
let postflop;
let monker;
let holdem;
let preflopData;
async function createWindow() {
  main = new BrowserWindow({
    width: 1440,
    height: 1000,
    minWidth: 850,
    minHeight: 650,
    backgroundColor: "#080909",
    title: "Poker GTO Advisor",
    autoHideMenuBar: true,
    show: !smoke && !measure,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      // Table play happens in Edge: polling and stale-advice timers must keep
      // running while this window is covered or minimized.
      backgroundThrottling: false,
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
      (openStudy ? "?view=lab" : (measure || process.argv.includes("--live")) ? "?view=live" : ""),
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
  if (measure) {
    await require("./measure-decisions.cjs").run(main, liveBridge);
    app.exit(0);
    return;
  }
  if (smoke) {
    try {
      await require("./smoke.cjs").run(main, liveBridge);
      app.exit(0);
    } catch (e) {
      const output = path.resolve(process.env.POKER_SMOKE_OUTPUT || "artifacts");
      await fs.mkdir(output, { recursive: true });
      await fs.writeFile(path.join(output, "smoke-failure.json"), JSON.stringify({
        version: app.getVersion(), packaged: app.isPackaged,
        message: e.message, stack: e.stack,
        page: await main.webContents.executeJavaScript('document.body.innerText').catch(() => ''),
      }, null, 2));
      await fs.writeFile(path.join(output, "smoke-failure.png"),
        (await main.webContents.capturePage()).toPNG()).catch(() => {});
      console.error(e);
      app.exit(1);
    }
  }
}
app
  .whenReady()
  .then(async () => {
    preflopData=new (require('./preflop-data.cjs').PreflopData)(process.env.POKER_PREFLOP_DIR||path.join(app.getPath('userData'),'preflop'));
    shortdeck = new (require("./shortdeck-service.cjs").ShortdeckService)({
      directory: process.env.POKER_TEXAS_SOLVER_DIR || path.join(app.getPath("userData"),"solvers","texassolver-v0.2.0"),
      temporaryRoot: path.join(app.getPath("temp"),"poker-shortdeck-jobs"),
    });
    postflop = new (require("./postflop-service.cjs").PostflopService)({
      directory: process.env.POKER_POSTFLOP_SOLVER_DIR || path.join(app.getPath("userData"),"solvers","postflop-fast"),
      temporaryRoot: path.join(app.getPath("temp"),"poker-postflop-jobs"),
    });
    monker=new (require('./monker-service.cjs').MonkerService)({directory:process.env.POKER_MONKER_SOLVER_DIR||path.join(app.getPath('userData'),'solvers','monker-free'),temporaryRoot:path.join(app.getPath('temp'),'poker-monker-jobs')});
    holdem=new (require('./holdem-service.cjs').HoldemService)();
    try {
      const savedPair = await fs
        .readFile(
          path.join(app.getPath("userData"), "live-connection.json"),
          "utf8",
        )
        .then(JSON.parse)
        .catch(() => null);
      liveBridge = await require("./live-bridge.cjs").createLiveBridge({
        port: smoke || measure || process.argv.includes("--verify-review") ? 0 : 47832,
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
        if (url.hostname === "app" && request.method === "GET" && url.pathname === "/flop-study") {
          try {
            const body = await require("./flop-study.cjs").readBoard(
              path.join(app.getPath("userData"), "flop-study"), url.searchParams.get("board"));
            return new Response(body, {headers:{"Content-Type":"application/json"}});
          } catch (error) {
            return Response.json({error:error.code === "ENOENT"
              ? "Flopbiblioteket saknas. Installera det med python scripts/install-flop-study.py i projektmappen."
              : error.message}, {status:422});
          }
        }
        if (url.hostname === "app" && ["/sixplus-solve","/sixplus-cancel","/postflop-solve","/postflop-cancel","/monker-solve","/monker-cancel","/holdem-solve","/holdem-cancel"].includes(url.pathname) && request.method === "POST") {
          const origin = request.headers.get("origin");
          if (origin && origin !== "poker://app") return new Response("Forbidden",{status:403});
          try {
            const body = await request.text();
            if (body.length > (url.pathname.startsWith('/monker-')||url.pathname.startsWith('/holdem-')?512000:128000)) return new Response("Too large",{status:413});
            const data=JSON.parse(body);
            const service=url.pathname.startsWith('/holdem-')?holdem:url.pathname.startsWith('/monker-')?monker:url.pathname.startsWith('/postflop-') ? postflop : shortdeck;
            if (url.pathname.endsWith('-cancel')) {
              if(typeof data.id !== "string" || !/^[a-f0-9-]{36}$/.test(data.id))return Response.json({error:"Invalid job identity"},{status:422});
              service.cancel(data.id);return Response.json({ok:true});
            }
            return Response.json(service===postflop ? await service.compute(data.config,data.line,data.id) : await service.compute(data.config,data.id));
          } catch(error) {return Response.json({error:error.message,code:error.code},{status:error.code==='SOLVER_UNAVAILABLE'?503:422});}
        }
        if (url.hostname !== "app" || !["GET", "HEAD"].includes(request.method))
          return new Response("Forbidden", { status: 403 });
        if (url.pathname === "/hand-review") {
          const hand = liveBridge?.reviewedHand(url.searchParams.get("id"), url.searchParams.get("reader"));
          return Response.json(hand ?? null, {status: hand ? 200 : 404, headers: {"Cache-Control":"no-store"}});
        }
        if(url.pathname==='/preflop-data'){
          try{return Response.json(await preflopData.load(),{headers:{'Cache-Control':'no-store'}});}
          catch(error){return Response.json({error:error.message,code:error.code},{status:503});}
        }
        if (url.pathname === "/live-state") {
          if (url.searchParams.has("after"))
            await liveBridge?.waitForChange(Number(url.searchParams.get("after")), request.signal);
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
        }
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
    if (measure && process.env.POKER_MEASURE_OUTPUT) {
      const out = path.resolve(process.env.POKER_MEASURE_OUTPUT);
      fs.mkdir(out, {recursive:true}).then(() => fs.writeFile(path.join(out, "benchmark-error.txt"), String(error.stack || error))).finally(() => app.exit(1));
      return;
    }
    if (!smoke && !measure)
      dialog.showErrorBox("Poker GTO Advisor kunde inte starta", String(error));
    app.exit(1);
  });
app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => {
  postflop?.cancel();
  monker?.close();
  holdem?.close();
  shortdeck?.cancel();
  liveBridge?.close();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
