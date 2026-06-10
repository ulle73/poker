using System;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using Windows.Graphics.Capture;
using Windows.Graphics.DirectX;
using Windows.Graphics.DirectX.Direct3D11;
using Windows.Graphics.Imaging;
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

    public event EventHandler<Mat>? FrameProcessed;

    public async Task<bool> StartCaptureAsync(nint hwnd)
    {
        try
        {
            _captureItem = GraphicsCaptureItem.CreateFromWindowId(
                Win32Interop.GetWindowIdFromWindow(hwnd));

            if (_captureItem == null) return false;

            var d3dDevice = new Device(DriverType.Hardware, DeviceCreationFlags.BgraSupport);
            var dxgiDevice = d3dDevice.QueryInterface<SharpDX.DXGI.Device>();
            var device = Direct3D11Helper.CreateDirect3DDeviceFromSharpDXDevice(dxgiDevice);

            _framePool = Direct3D11CaptureFramePool.Create(
                device, DirectXPixelFormat.B8G8R8A8UIntNormalized, 2, _captureItem.Size);

            _session = _framePool.CreateCaptureSession(_captureItem);
            _session.StartCapture();

            _framePool.FrameArrived += OnFrameArrived;
            return true;
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Capture start error: {ex.Message}");
            return false;
        }
    }

    private void OnFrameArrived(Direct3D11CaptureFramePool sender, object args)
    {
        using var frame = sender.TryGetNextFrame();
        if (frame == null) return;

        Mat? mat = null;
        try
        {
            mat = FrameToMat(frame);
            if (mat != null)
                FrameProcessed?.Invoke(this, mat);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Frame conversion error: {ex.Message}");
            mat?.Dispose();
        }
    }

    private Mat? FrameToMat(Direct3D11CaptureFrame frame)
    {
        try
        {
            using var softwareBitmap = SoftwareBitmap.CreateCopyFromSurfaceAsync(
                frame.Surface, BitmapAlphaMode.Premultiplied).GetAwaiter().GetResult();

            // Reliable conversion using BitmapBuffer
            using var buffer = softwareBitmap.LockBuffer(BitmapBufferAccessMode.Read);
            using var reference = buffer.CreateReference();

            var mat = new Mat(softwareBitmap.PixelHeight, softwareBitmap.PixelWidth, MatType.CV_8UC4);

            unsafe
            {
                byte* dataInBytes;
                uint capacity;
                reference.As<IMemoryBufferByteAccess>().GetBuffer(out dataInBytes, out capacity);

                // Copy pixels (BGRA)
                Buffer.MemoryCopy(dataInBytes, mat.DataPointer, capacity, capacity);
            }

            // Convert BGRA to BGR if needed for OpenCV
            var bgrMat = new Mat();
            Cv2.CvtColor(mat, bgrMat, ColorConversionCodes.BGRA2BGR);
            mat.Dispose();

            return bgrMat;
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"FrameToMat failed: {ex.Message}");
            return null;
        }
    }

    public void Stop()
    {
        _session?.Dispose();
        _framePool?.Dispose();
        _captureItem = null;
    }

    public void Dispose() => Stop();
}

[ComImport]
[Guid("5B0D3235-4DBA-4D6E-9E0B-1F0E0E0E0E0E")] // Approximate - use correct GUID if needed
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
unsafe interface IMemoryBufferByteAccess
{
    void GetBuffer(out byte* buffer, out uint capacity);
}

public static class Direct3D11Helper
{
    [DllImport("d3d11.dll", EntryPoint = "CreateDirect3D11DeviceFromDXGIDevice", SetLastError = true, CharSet = CharSet.Auto)]
    private static extern uint CreateDirect3D11DeviceFromDXGIDevice(IntPtr dxgiDevice, out IntPtr graphicsDevice);

    public static IDirect3DDevice CreateDirect3DDeviceFromSharpDXDevice(SharpDX.DXGI.Device dxgiDevice)
    {
        var hr = CreateDirect3D11DeviceFromDXGIDevice(dxgiDevice.NativePointer, out IntPtr pUnknown);
        if (hr != 0) throw new Exception($"Failed to create Direct3D11 device. HRESULT: {hr}");

        return Windows.Graphics.DirectX.Direct3D11.Direct3D11Device.FromAbi(pUnknown);
    }
}