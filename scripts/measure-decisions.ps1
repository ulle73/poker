param(
    [string]$Executable = "$PSScriptRoot/../release/win-unpacked/Poker GTO Advisor.exe",
    [string]$Output = "$PSScriptRoot/../artifacts/decision-timings",
    [int[]]$Counts = @(2,3,4,5,6),
    [string[]]$Streets = @("preflop","flop","turn","river"),
    [switch]$IncludeSixPlus,
    [switch]$CheckedTo,
    [switch]$UncertainSeat,
    [switch]$ClosingAllIn
)
$ErrorActionPreference = "Stop"
$program = (Resolve-Path -LiteralPath $Executable).Path
$dataRoot = Join-Path $env:APPDATA 'Poker GTO Advisor'
$env:POKER_PREFLOP_DIR = Join-Path $dataRoot 'preflop'
$env:POKER_POSTFLOP_SOLVER_DIR = Join-Path $dataRoot 'solvers/postflop-fast'
$env:POKER_MONKER_SOLVER_DIR = Join-Path $dataRoot 'solvers/monker-free'
$env:POKER_TEXAS_SOLVER_DIR = Join-Path $dataRoot 'solvers/texassolver-v0.2.0'
$env:POKER_MEASURE_OUTPUT = [IO.Path]::GetFullPath($Output)
function Measure-Case([int]$Count, [string]$Street, [string]$Variant) {
    $env:POKER_MEASURE_COUNT = [string]$Count
    $env:POKER_MEASURE_STREET = $Street
    $env:POKER_MEASURE_VARIANT = $Variant
    $process = Start-Process -FilePath $program -ArgumentList '--measure-decisions' -WindowStyle Hidden -PassThru
    if (!$process.WaitForExit(90000)) {
        $process.Kill()
        throw "Windows-provet svarade inte ($Count, $Street, $Variant)."
    }
    if ($process.ExitCode -ne 0) { throw "Windows-provet avslutades med kod $($process.ExitCode)." }
    Write-Output "$Count · $Street · $Variant"
}
if ($ClosingAllIn) { foreach ($count in $Counts) { Measure-Case $count "flop" "closing-all-in" }; return }
if ($UncertainSeat) { Measure-Case 3 "flop" "uncertain-seat"; return }
if ($CheckedTo) {
    foreach ($street in @("flop","turn","river")) { Measure-Case 2 $street "checked-to" }
    return
}
foreach ($count in $Counts) {
    foreach ($street in $Streets) { Measure-Case $count $street "holdem" }
}
if ($IncludeSixPlus) { Measure-Case 2 "river" "sixplus" }
