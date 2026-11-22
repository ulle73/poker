#Requires -Version 7.0
param(
  [Parameter(Mandatory)][string]$MonkerDirectory,
  [Parameter(Mandatory)][string]$JavaPath
)
$ErrorActionPreference = 'Stop'
$runtimeDirectory = (Resolve-Path -LiteralPath $MonkerDirectory).Path
$javaExecutable = (Resolve-Path -LiteralPath $JavaPath).Path
$application = Join-Path $runtimeDirectory 'MonkerSolverFree.exe'
$expectedApplicationHash = 'f66d7f2b5d8b35393577a39abfc0325215f26dd5102355e1ae49be477318e652'
if ((Get-FileHash -Algorithm SHA256 -LiteralPath $application).Hash.ToLowerInvariant() -ne $expectedApplicationHash) {
  throw 'Monker-binären matchar inte den testade FREE 10114-versionen.'
}
# Launch only. The vendor GUI does not provide a verified CLI for its Threads
# setting. Do not silently pretend that this script sets it or solves a hand.
$processInfo = [Diagnostics.ProcessStartInfo]::new()
$processInfo.FileName = $javaExecutable
$processInfo.WorkingDirectory = $runtimeDirectory
$processInfo.UseShellExecute = $false
$processInfo.CreateNoWindow = $false
$processInfo.WindowStyle = [Diagnostics.ProcessWindowStyle]::Normal
foreach ($argument in @('-Xmx2g', '-Dsun.java2d.d3d=false', '-Dsun.java2d.uiScale=1.0', '-jar', $application)) {
  $processInfo.ArgumentList.Add($argument)
}
$launchedProcess = [Diagnostics.Process]::Start($processInfo)
Write-Host 'Testad profil: Adoptium 17.0.16.8; Settings → Threads 8, Keep avg 2, Keep EV 2.'
Write-Host 'Threads/avg/EV måste väljas i Monkers GUI efter start; skriptet styr inte dessa fält.'
Write-Host 'Detta är manuell studie, utan verifierad 2 %-felgräns eller liveintegration.'
[pscustomobject]@{ Id=$launchedProcess.Id; Application=$application; Java=$javaExecutable }
