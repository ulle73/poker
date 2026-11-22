# Compatibility entry point; the older UCSandman bridge is a historical baseline.
param([switch]$Install)
& (Join-Path $PSScriptRoot 'build-binary-postflop.ps1') -Install:$Install
