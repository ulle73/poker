using System;
using System.Threading.Tasks;
using Windows.Graphics.Capture;
using Windows.Graphics.DirectX;
using Windows.Graphics.DirectX.Direct3D11;
using Windows.UI.Composition;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Hosting;

// Basic screen/window capture service using Windows.Graphics.Capture
// Requires the app to have graphicsCapture capability in Package.appxmanifest

namespace PokerHUD.Services;

public class CaptureService
{
    private GraphicsCaptureItem? _captureItem;
    private Direct3D11CaptureFramePool? _framePool;
    private GraphicsCaptureSession? _session;

    public event EventHandler<Direct3D11CaptureFrame>? FrameArrived;

    public async Task<bool> StartCaptureAsync(nint windowHandle)
    {
        try
        {
            _captureItem = GraphicsCaptureItem.CreateFromWindowId(
                Microsoft.UI.Win32Interop.GetWindowIdFromWindow(windowHandle));

            if (_captureItem == null) return false;

            var device = Direct3D11Helper.CreateDevice();
            _framePool = Direct3D11CaptureFramePool.Create(
                device,
                DirectXPixelFormat.B8G8R8A8UIntNormalized,
                2,
                _captureItem.Size);

            _session = _framePool.CreateCaptureSession(_captureItem);
            _session.StartCapture();

            _framePool.FrameArrived += OnFrameArrived;

            return true;
        }
        catch (Exception ex)
        {
            // Log or handle error
            Console.WriteLine($"Capture error: {ex.Message}");
            return false;
        }
    }

    private void OnFrameArrived(Direct3D11CaptureFramePool sender, object args)
    {
        using var frame = sender.TryGetNextFrame();
        if (frame != null)
        {
            FrameArrived?.Invoke(this, frame);
        }
    }

    public void StopCapture()
    {
        _session?.Dispose();
        _framePool?.Dispose();
        _captureItem = null;
    }
}

// Helper class for Direct3D11 device creation (add this in same file or separate)
public static class Direct3D11Helper
{
    public static IDirect3DDevice CreateDevice()
    {
        var d3dDevice = new SharpDX.Direct3D11.Device(
            SharpDX.Direct3D.DriverType.Hardware,
            SharpDX.Direct3D11.DeviceCreationFlags.BgraSupport);

        var device = Direct3D11Helper.CreateDirect3DDeviceFromSharpDXDevice(d3dDevice);
        return device;
    }

    // You may need to add SharpDX or use Windows-provided helpers.
    // Alternative simpler approach exists with Composition APIs.
}