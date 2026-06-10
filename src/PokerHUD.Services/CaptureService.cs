using System;
using System.Threading.Tasks;
using Windows.Graphics.Capture;
using Windows.Graphics.DirectX;
using Windows.Graphics.DirectX.Direct3D11;
using Windows.UI.Composition;
using Microsoft.UI.Xaml;
using OpenCvSharp;
using SharpDX.Direct3D11;
using Device = SharpDX.Direct3D11.Device;

namespace PokerHUD.Services;

public class CaptureService : IDisposable
{
    private GraphicsCaptureItem? _captureItem;
    private Direct3D11CaptureFramePool? _framePool;
    private GraphicsCaptureSession? _session;
    private IDirect3DDevice? _device;

    public event EventHandler<Mat>? FrameProcessed;

    public async Task<bool> StartCaptureAsync(nint hwnd)
    {
        try
        {
            _captureItem = GraphicsCaptureItem.CreateFromWindowId(
                Win32Interop.GetWindowIdFromWindow(hwnd));

            if (_captureItem == null) return false;

            _device = Direct3D11Helper.CreateDirect3DDevice();
            _framePool = Direct3D11CaptureFramePool.Create(
                _device,
                DirectXPixelFormat.B8G8R8A8UIntNormalized,
                2, _captureItem.Size);

            _session = _framePool.CreateCaptureSession(_captureItem);
            _session.StartCapture();

            _framePool.FrameArrived += OnFrameArrived;
            return true;
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Capture start failed: {ex}");
            return false;
        }
    }

    private void OnFrameArrived(Direct3D11CaptureFramePool sender, object args)
    {
        using var frame = sender.TryGetNextFrame();
        if (frame == null) return;

        try
        {
            // Convert D3D frame to OpenCV Mat
            using var softwareBitmap = SoftwareBitmap.CreateCopyFromSurfaceAsync(frame.Surface).GetAwaiter().GetResult();
            using var mat = SoftwareBitmapToMat(softwareBitmap);
            FrameProcessed?.Invoke(this, mat);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Frame processing error: {ex}");
        }
    }

    private static Mat SoftwareBitmapToMat(Windows.Graphics.Imaging.SoftwareBitmap softwareBitmap)
    {
        // Convert SoftwareBitmap to OpenCV Mat (BGR)
        // This is a simplified version - in production use a more robust converter
        var mat = new Mat(softwareBitmap.PixelHeight, softwareBitmap.PixelWidth, MatType.CV_8UC4);
        // TODO: Proper pixel copy using BitmapBuffer or SharpDX
        // For now, user can implement or use a library helper
        return mat;
    }

    public void Stop()
    {
        _session?.Dispose();
        _framePool?.Dispose();
        _captureItem = null;
    }

    public void Dispose() => Stop();
}

public static class Direct3D11Helper
{
    public static IDirect3DDevice CreateDirect3DDevice()
    {
        var d3dDevice = new Device(DriverType.Hardware, DeviceCreationFlags.BgraSupport);
        var dxgiDevice = d3dDevice.QueryInterface<SharpDX.DXGI.Device>();
        var device = Direct3D11Helper.CreateDirect3DDeviceFromSharpDXDevice(dxgiDevice);
        return device;
    }
}