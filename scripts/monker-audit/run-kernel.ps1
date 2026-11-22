param(
  [Parameter(Mandatory)][string]$InputArchive,
  [Parameter(Mandatory)][string]$VendorDirectory,
  [Parameter(Mandatory)][string]$OutputDirectory,
  [Parameter(Mandatory)][string]$JavaDirectory,
  [ValidateRange(0,6000)][int]$Milliseconds=2000,
  [ValidateRange(1,8)][int]$Threads=8
)
$ErrorActionPreference='Stop'
$probeInput=(Resolve-Path -LiteralPath $InputArchive).Path
$probeRuntime=(Resolve-Path -LiteralPath $VendorDirectory).Path
$probeBinary=Join-Path $probeRuntime 'MonkerSolverFree.exe'
$probeRanks=Join-Path $probeRuntime 'handRanks.ser'
if((Get-FileHash -LiteralPath $probeBinary -Algorithm SHA256).Hash.ToLowerInvariant() -ne 'f66d7f2b5d8b35393577a39abfc0325215f26dd5102355e1ae49be477318e652'){throw 'Unsupported vendor binary'}
if((Get-FileHash -LiteralPath $probeRanks -Algorithm SHA256).Hash.ToLowerInvariant() -ne 'd927fac383d43d8743fa50b81e3684fcd26a900ee548ec4b38668ab9fe7a6fc5'){throw 'Unsupported rank cache'}
$probeOutput=[IO.Path]::GetFullPath($OutputDirectory)
[void](New-Item -ItemType Directory -Force -Path $probeOutput)
$probeClasses=Join-Path $probeOutput 'classes'
[void](New-Item -ItemType Directory -Force -Path $probeClasses)
$probeJava=Join-Path $JavaDirectory 'java.exe'
$probeJavac=Join-Path $JavaDirectory 'javac.exe'
$probeSources=@('MonkerPolicyExport.java','MonkerKernel.java','MonkerCoreProbe.java','MonkerCoreCheck.java','MonkerKernelBench.java','MonkerCheckpointProbe.java') | ForEach-Object {Join-Path $PSScriptRoot $_}
& $probeJavac -cp $probeBinary -d $probeClasses $probeSources
if($LASTEXITCODE){throw 'Java compilation failed'}
$probeClock=[Diagnostics.Stopwatch]::StartNew()
$probeArchive=Join-Path $probeOutput 'trained.mkr'
$probeDecoded=Join-Path $probeOutput 'decoded.json'
$probeQuality=Join-Path $probeOutput 'quality.json'
$probeClassPath=$probeClasses+';'+$probeBinary
Push-Location -LiteralPath $probeRuntime
try {
  & $probeJava '-Djava.awt.headless=true' -cp $probeClassPath c.MonkerCoreProbe $probeInput $probeBinary $probeArchive $Milliseconds $Threads fresh | Set-Content -Encoding utf8 (Join-Path $probeOutput 'kernel-stdout.log')
  if($LASTEXITCODE){throw 'Vendor numeric job failed; no qualified result'}
  & $probeJava '-Djava.awt.headless=true' -cp $probeClassPath c.MonkerPolicyExport $probeArchive $probeBinary | Set-Content -Encoding utf8 $probeDecoded
  if($LASTEXITCODE){throw 'Policy decoding failed'}
} finally {Pop-Location}
node (Join-Path $PSScriptRoot 'audit-file.mjs') $probeDecoded $probeQuality average max-unilateral | Set-Content -Encoding utf8 (Join-Path $probeOutput 'audit-stdout.log')
if($LASTEXITCODE -notin @(0,2)){throw 'Audit process failed'}
$probeClock.Stop()
$probeReport=Get-Content -Raw -LiteralPath $probeQuality | ConvertFrom-Json
$probeTiming=[ordered]@{
  coldProcessToAuditMs=$probeClock.Elapsed.TotalMilliseconds
  includes=@('Java launch','kernel initialization','training','archive write','second Java launch','decode','Node launch','independent audit')
  excludes=@('source compilation','hash preflight','app transport','UI rendering')
  qualityMetric=$probeReport.qualityMetric
  errorPct=$probeReport.qualityErrorPct
  accepted=$probeReport.accepted
  appIntegrationVerified=$false
}
$probeTiming | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 (Join-Path $probeOutput 'pipeline-timing.json')
$probeTiming | ConvertTo-Json -Depth 4
