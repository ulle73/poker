param([switch]$Install)
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$revision = '9d1509fe5077d019825f833eed04b16d342dfda1'
$source = Join-Path $repo '.research\binary-postflop'
$wrapper = Join-Path $repo 'native\binary-postflop-bridge'
if (!(Test-Path -LiteralPath $source)) {
    git init $source
    if ($LASTEXITCODE) { throw 'Source directory creation failed' }
    git -C $source remote add origin https://github.com/b-inary/postflop-solver.git
    if ($LASTEXITCODE) { throw 'Source remote setup failed' }
    git -C $source fetch --depth 1 origin $revision
    if ($LASTEXITCODE) { throw 'Pinned source fetch failed' }
    git -C $source checkout --detach FETCH_HEAD
    if ($LASTEXITCODE) { throw 'Source checkout failed' }
}
if ((git -C $source rev-parse HEAD).Trim() -ne $revision) { throw 'Unexpected engine revision' }
$patch = Join-Path $wrapper 'rust-compat.patch'
if (!(git -C $source status --porcelain)) {
    git -C $source apply --check $patch
    if ($LASTEXITCODE) { throw 'Compiler compatibility patch does not apply' }
    git -C $source apply $patch
    if ($LASTEXITCODE) { throw 'Compiler compatibility patch failed' }
}
# Accept exactly three explicit-reference changes, including no other edits
# inside the patched file. The solver algorithms remain the pinned vendor code.
$changes = @(git -C $source status --porcelain)
if ($changes.Count -ne 1 -or $changes[0] -ne ' M src/action_tree.rs') { throw 'Unexpected engine source changes' }
$original = (git -C $source show 'HEAD:src/action_tree.rs') -join "`n"
if ($LASTEXITCODE) { throw 'Cannot read pristine source' }
$expected = $original.Replace('node = &*(*node).children[0].lock();','node = &*(&(*node).children)[0].lock();').Replace('node = &*(*node).children[index].lock();','node = &*(&(*node).children)[index].lock();')
$actual = [IO.File]::ReadAllText((Join-Path $source 'src\action_tree.rs')).Replace("`r`n","`n").TrimEnd("`n")
if ($actual -cne $expected.TrimEnd("`n")) { throw 'Engine differs from reviewed compiler-only patch' }
git -C $source apply --reverse --check $patch
if ($LASTEXITCODE) { throw 'Compatibility patch verification failed' }
$cargo = (Get-Command cargo -ErrorAction SilentlyContinue).Source
if (!$cargo -and $env:CARGO_HOME) { $cargo = Join-Path $env:CARGO_HOME 'bin\cargo.exe' }
if (!$cargo -or !(Test-Path -LiteralPath $cargo)) { throw 'Official Rust minimal MSVC toolchain required' }
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$vs = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (!$vs) { throw 'MSVC Build Tools are required' }
$dev = Join-Path $vs 'Common7\Tools\VsDevCmd.bat'
$env:RUSTFLAGS = '-C target-cpu=native'
& cmd.exe /d /c ('call "' + $dev + '" -arch=x64 -host_arch=x64 >nul && "' + $cargo + '" build --release --locked -j 4 --manifest-path "' + (Join-Path $wrapper 'Cargo.toml') + '"')
if ($LASTEXITCODE) { throw 'Native build failed' }
$target = if ($env:CARGO_TARGET_DIR) { $env:CARGO_TARGET_DIR } else { Join-Path $wrapper 'target' }
$exe = Join-Path $target 'release\poker-binary-postflop-bridge.exe'
$hash = (Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLowerInvariant()
$provenancePath = Join-Path $repo 'docs\solver-provenance.json'
$provenance = Get-Content -LiteralPath $provenancePath -Raw | ConvertFrom-Json
$provenance.optionalFastNativePostflop.exeSha256 = $hash
$provenance.optionalFastNativePostflop.compiler = ((& (Join-Path (Split-Path $cargo) 'rustc.exe') --version) + ', MSVC, release, target-cpu=native')
[IO.File]::WriteAllText($provenancePath,($provenance | ConvertTo-Json -Depth 12) + "`n",[Text.UTF8Encoding]::new($false))
if ($Install) {
    $destination = Join-Path $env:APPDATA 'Poker GTO Advisor\solvers\postflop-fast'
    New-Item -ItemType Directory -Path $destination -Force | Out-Null
    Copy-Item -LiteralPath $exe -Destination (Join-Path $destination 'poker-postflop-bridge.exe')
    Copy-Item -LiteralPath (Join-Path $wrapper 'LICENSE.txt') -Destination (Join-Path $destination 'LICENSE.txt')
    $metadata = @{sourceRevision=$revision;exeSha256=$hash;locallyBuilt=$true;cpuSpecific=$true;engine='b-inary';license='AGPL-3.0-or-later'}
    [IO.File]::WriteAllText((Join-Path $destination 'manifest.json'),($metadata | ConvertTo-Json),[Text.UTF8Encoding]::new($false))
}
Write-Output "Native executable SHA-256: $hash"
Write-Output 'AGPL-3.0-or-later, CPU-specific local build. Rebuild and reverify on another computer.'
