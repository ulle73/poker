// Local Windows research toolchain only; no application or global settings change.
import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, delimiter } from "node:path";
import { fileURLToPath } from "node:url";
const project = fileURLToPath(new URL("../", import.meta.url));
const root = resolve(project, ".research/tools/rust");
const shims = resolve(project, "research/noregrets/toolchain");
const cargo = resolve(root, "cargo/bin/cargo.exe");
const linker = resolve(root,
  "rustup/toolchains/stable-x86_64-pc-windows-gnu/lib/rustlib/x86_64-pc-windows-gnu/bin/rust-lld.exe");
if (!existsSync(cargo) || !existsSync(linker)) {
  throw new Error("Project-local Rust GNU toolchain missing; see research/noregrets/README.md.");
}
// Install local compiler templates without altering the user's PATH or toolchain.
for (const name of ["zig-cc.cmd", "zig-cc.mjs", "zig-ar.cmd", "dlltool.cmd"]) {
  const content = readFileSync(resolve(shims, name));
  const target = resolve(root, name);
  if (!existsSync(target) || !readFileSync(target).equals(content))
    writeFileSync(target, content);
}
const env = { ...process.env };
const pathKey = Object.keys(env).find((k) => k.toLowerCase() === "path") ?? "Path";
env[pathKey] = root + "/cargo/bin" + delimiter + (env[pathKey] ?? "");
env.CARGO_HOME = root + "/cargo";
env.RUSTUP_HOME = root + "/rustup";
env.CC_x86_64_pc_windows_gnu = root + "/zig-cc.cmd";
env.AR_x86_64_pc_windows_gnu = root + "/zig-ar.cmd";
env.CARGO_TARGET_X86_64_PC_WINDOWS_GNU_LINKER = root +
  "/rustup/toolchains/stable-x86_64-pc-windows-gnu/lib/rustlib/x86_64-pc-windows-gnu/bin/rust-lld.exe";
env.RUSTFLAGS = "-C linker-flavor=ld.lld -C link-self-contained=yes -C dlltool=" +
  root + "/dlltool.cmd";
// Mimalloc expands build timestamps for diagnostic output; keep the warning.
env.CFLAGS_x86_64_pc_windows_gnu = "-Wno-error=date-time";
env.RAYON_NUM_THREADS = "4";
const child = spawn(cargo, process.argv.slice(2), {
  cwd: project, env, stdio: "inherit",
});
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
