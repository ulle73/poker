param([Parameter(Mandatory=$true)][string]$VendorDirectory,[Parameter(Mandatory=$true)][string]$SdkDirectory,[string]$Destination=(Join-Path $env:APPDATA 'Poker GTO Advisor\solvers\holdem-gateway'))
$ErrorActionPreference='Stop'
$vendor=(Resolve-Path -LiteralPath (Join-Path $VendorDirectory 'nlhe-solver-desktop.exe')).Path
if((Get-FileHash -LiteralPath $vendor -Algorithm SHA256).Hash -ne '3A19379ED2743EDB1234FA8AF7B4B2EADE7140ECAD0159ACC4DD6FC2F089EC7E'){throw 'Expected the original official Holdem Solver 0.93 executable'}
$dependencies=@{
 'lib\net462\Microsoft.Web.WebView2.Core.dll'='2B999D1775004E98B32F281F4518F3952DF650970748527EF5B54FA9979D6C9C';
 'runtimes\win-x64\native\WebView2Loader.dll'='8427B1FC58EC707813E5C0A51EB5D69397BB333250A7B891BE4D3B123F1E0F1C'
}
foreach($relative in $dependencies.Keys){if((Get-FileHash -LiteralPath (Join-Path $SdkDirectory $relative) -Algorithm SHA256).Hash -ne $dependencies[$relative]){throw 'Expected official Microsoft.Web.WebView2 1.0.3650.58 dependency'}}
New-Item -ItemType Directory -Path $Destination -Force | Out-Null
foreach($relative in $dependencies.Keys){Copy-Item -LiteralPath (Join-Path $SdkDirectory $relative) -Destination $Destination -Force}
$source=Join-Path $PSScriptRoot '..\native\holdem-gateway\OfficialSessionHost.cs'
$compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
& $compiler /nologo /target:exe /platform:x64 "/out:$Destination\OfficialSessionHost.exe" /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.Net.Http.dll /r:System.Web.Extensions.dll "/r:$Destination\Microsoft.Web.WebView2.Core.dll" $source
if($LASTEXITCODE -ne 0){throw 'Session host compilation failed'}
$hashes=@{}
foreach($name in @('OfficialSessionHost.exe','Microsoft.Web.WebView2.Core.dll','WebView2Loader.dll')){$hashes[$name]=(Get-FileHash -LiteralPath (Join-Path $Destination $name) -Algorithm SHA256).Hash.ToLowerInvariant()}
$manifest=@{schema='poker-holdem-gateway-v1';vendorVersion='0.93';releaseBuild='0de6fe60b0acf0220aa7efa87b4b821cf81172ee';vendorExe=$vendor;vendorSha256='3a19379ed2743edb1234fa8af7b4b2eade7140ecad0159acc4dd6fc2f089ec7e';sdkVersion='1.0.3650.58';sdkPackageSha256='911a472128c82ac8baa0c486c23342cc9dd6e7dc50d754e676726642ca065c60';hostSourceSha256=(Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant();hashes=$hashes;memoryReserveMB=384}
[IO.File]::WriteAllText((Join-Path $Destination 'manifest.json'),($manifest | ConvertTo-Json -Depth 5),[Text.UTF8Encoding]::new($false))
Write-Output ('Installed authenticated Holdem session host: '+$Destination)
