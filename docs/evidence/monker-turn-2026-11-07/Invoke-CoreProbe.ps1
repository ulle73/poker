param([string]$InputArchive,[string]$OutputName,[int]$Millis=2000,[int]$Threads=8,[string]$Mode='fresh',[int]$Warmup=0)
$ErrorActionPreference='Stop'
$probeRoot='C:\Users\ryd\Documents\Codex\2026-11-04\i-x20'
$probeVendor=Join-Path $probeRoot 'work\monker-free\runtime\MonkerSolverFree.exe'
$probeClasses=Join-Path $probeRoot 'work\monker-export\classes'
$probeOutput=Join-Path $probeRoot ('work\monker-turn-cause\'+$OutputName+'.mkr')
Push-Location (Split-Path -Parent $probeVendor)
try {
 & 'C:\Program Files\Eclipse Adoptium\jdk-17.0.16.8-hotspot\bin\java.exe' '-Djava.awt.headless=true' -cp ($probeClasses+';'+$probeVendor) c.MonkerCoreProbe $InputArchive $probeVendor $probeOutput $Millis $Threads $Mode $Warmup
 if($LASTEXITCODE){throw 'Numeric kernel failed'}
 & 'C:\Program Files\Eclipse Adoptium\jdk-17.0.16.8-hotspot\bin\java.exe' '-Djava.awt.headless=true' -cp ($probeClasses+';'+$probeVendor) c.MonkerPolicyExport $probeOutput $probeVendor | Set-Content -Encoding utf8 (Join-Path $probeRoot ('work\monker-turn-cause\'+$OutputName+'.json'))
 if($LASTEXITCODE){throw 'Decoder failed'}
 node C:/dev/poker/scripts/monker-audit/audit-file.mjs (Join-Path $probeRoot ('work\monker-turn-cause\'+$OutputName+'.json')) (Join-Path $probeRoot ('work\monker-turn-cause\'+$OutputName+'-quality.json')) | Out-Null
 if($LASTEXITCODE -ne 0){Write-Output 'Quality unknown'}
}finally{Pop-Location}
Get-Content -Raw (Join-Path $probeRoot ('work\monker-turn-cause\'+$OutputName+'-quality.json')) | ConvertFrom-Json | Select-Object players,nashConvPct,accepted,elapsedMs,error | ConvertTo-Json -Compress
