import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
// This template is copied into .research/tools/rust by native-research-cargo.mjs.
const zig = fileURLToPath(new URL("../zig-x86_64-windows-0.17.0/zig.exe", import.meta.url));
// cc-rs supplies Rust's four-component triple; Zig accepts its three-component form.
const args = process.argv.slice(2).map((a) =>
  a === "--target=x86_64-pc-windows-gnu" ? "--target=x86_64-windows-gnu" : a);
const child = spawnSync(zig, ["cc", "-target", "x86_64-windows-gnu", ...args], { stdio: "inherit" });
if (child.error) console.error(child.error.message);
process.exitCode = child.status ?? 1;
