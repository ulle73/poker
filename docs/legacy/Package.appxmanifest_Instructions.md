# Package.appxmanifest - Required Capabilities

Open your WinUI 3 project's Package.appxmanifest file and make these changes:

## 1. Add the restricted capability namespace at the top

```xml
<Package
  xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
  xmlns:mp="http://schemas.microsoft.com/appx/2014/phone/manifest"
  xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
  xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"
  IgnorableNamespaces="uap mp rescap">
```

## 2. Add the graphicsCapture capabilities

Inside the `<Capabilities>` section, add:

```xml
<Capabilities>
    <Capability Name="internetClient" />
    <rescap:Capability Name="graphicsCapture" />
    <rescap:Capability Name="graphicsCaptureWithoutBorder" />
</Capabilities>
```

This is required for `Windows.Graphics.Capture` to work.

After saving, rebuild the project.