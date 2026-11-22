param(
  [Parameter(Mandatory)][string]$RunDirectory,
  [Parameter(Mandatory)][string]$InspectorClassPath,
  [Parameter(Mandatory)][string]$JavaPath,
  [Parameter(Mandatory)][string]$ReferenceTree
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath $RunDirectory).Path
$starts = Get-Content -Raw -LiteralPath (Join-Path $root 'starts.json') | ConvertFrom-Json
$referenceHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $ReferenceTree).Hash.ToLowerInvariant()
$files = @()
foreach ($start in $starts) {
  $runExports = @(Get-ChildItem -LiteralPath (Join-Path $root 'exports') -Filter ($start.name + 'K*.mkr'))
  if ($runExports.Count -ne 1) { throw "Expected exactly one completed export for $($start.name); got $($runExports.Count)" }
  $files += $runExports[0].FullName
}
$raw = & $JavaPath -Xmx768m -cp $InspectorClassPath MonkerArchiveInspect @files
if ($LASTEXITCODE -ne 0) { throw 'Archive inspection failed' }
$archives = $raw | ConvertFrom-Json
if ($archives.Count -ne $starts.Count) { throw 'Archive count mismatch' }
$results = foreach ($start in $starts) {
  $file = Get-Item -LiteralPath ($files | Where-Object { [IO.Path]::GetFileName($_).StartsWith($start.name + 'K') })
  $archive = $archives | Where-Object file -eq $file.Name
  $data = $archive.entries
  $badNumbers = 0
  foreach ($property in $data.PSObject.Properties) {
    if ($null -ne $property.Value.readError) { throw "Unreadable entry $($property.Name) in $($file.Name)" }
    if ($null -ne $property.Value.nonfinite) { $badNumbers += $property.Value.nonfinite }
  }
  $board = $data.board -join ''
  if ($data.treeSha256 -ne $referenceHash -or $data.version -ne 10114 -or
      $data.game -ne 0 -or $data.tree.players -ne 6 -or $data.tree.street -ne 2 -or
      $board -ne 'Ks7d2c8h' -or $data.tree.potInternal -ne 4000 -or
      $data.tree.stacksInternal.Count -ne 6 -or
      @($data.tree.stacksInternal | Where-Object { $_ -ne 200000 }).Count -ne 0 -or
      $data.avgstreets -ne 2 -or $data.evstreets -ne 2 -or $data.isoLevel -ne 0 -or
      $data.iscount -ne 776832 -or $data.iterations -lt (10 * $data.iscount) -or $badNumbers -ne 0) {
    throw "Model/work/output validation failed for $($file.Name)"
  }
  foreach ($seat in 0..5) {
    $range = $data.('rng' + $seat)
    if ($range.length -ne 1326 -or $range.min -ne 1 -or $range.max -ne 1) { throw "Range mismatch in $($file.Name)" }
  }
  $elapsedMs = ([DateTimeOffset]$file.LastWriteTimeUtc).ToUnixTimeMilliseconds() - $start.startMs
  if ($elapsedMs -le 0) { throw 'Invalid clock interval' }
  [ordered]@{
    name=$start.name; runtime=$(if ($start.runtime) { $start.runtime } else { 'Adoptium 17.0.16.8' })
    threads=$start.threads; profiled=$start.profiled; ratio=$start.ratio
    startUtc=[DateTimeOffset]::FromUnixTimeMilliseconds($start.startMs).ToString('o')
    exportUtc=([DateTimeOffset]$file.LastWriteTimeUtc).ToString('o')
    elapsedMs=$elapsedMs; iterations=$data.iterations; informationStates=$data.iscount
    iterationsPerSecond=[Math]::Round($data.iterations * 1000 / $elapsedMs)
    file=$file.Name; fileSha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $file.FullName).Hash.ToLowerInvariant()
    bytes=$file.Length; treeSha256=$data.treeSha256; board=$board
    modelVerified=$true; outputFinite=$true; averageShape=$data.avg
    qualityPct=$null; qualityVerified=$false; appAdviceVerified=$false
  }
}
$raw | Set-Content -LiteralPath (Join-Path $root 'archive-inspection.json') -Encoding utf8
$results | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $root 'measurements.json') -Encoding utf8
$results | ForEach-Object { [pscustomobject]@{ Name=$_.name; Threads=$_.threads; Milliseconds=$_.elapsedMs; Iterations=$_.iterations; ModelValid=$_.modelVerified } } | Format-Table
