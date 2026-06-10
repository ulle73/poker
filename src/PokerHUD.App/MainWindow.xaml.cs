using Microsoft.UI.Xaml;
using PokerHUD.Models;
using PokerHUD.Services;
using System;
using System.Diagnostics;
using Windows.Foundation;

namespace PokerHUD.App;

public sealed partial class MainWindow : Window
{
    private CaptureService? _captureService;
    private VisionService? _visionService;
    private DecisionEngine? _decisionEngine;
    private GameState _currentState = new();

    public MainWindow()
    {
        this.InitializeComponent();

        // TODO: Set correct path to your card templates folder
        string templatesPath = @"C:\PokerHUD\CardTemplates";
        _visionService = new VisionService(templatesPath);
        _decisionEngine = new DecisionEngine();
    }

    private async void StartCapture_Click(object sender, RoutedEventArgs e)
    {
        // For MVP: User can hardcode or add picker for poker window handle
        // Example: Find poker window by title (implement FindWindow via P/Invoke)
        var hwnd = FindPokerWindow(); // Implement this helper

        if (hwnd == IntPtr.Zero)
        {
            StatusText.Text = "Poker window not found. Please open your poker client.";
            return;
        }

        _captureService = new CaptureService();
        _captureService.FrameProcessed += OnFrameProcessed;

        bool started = await _captureService.StartCaptureAsync(hwnd);
        if (started)
        {
            StartCaptureBtn.IsEnabled = false;
            StopCaptureBtn.IsEnabled = true;
            StatusText.Text = "Capturing...";
        }
    }

    private void OnFrameProcessed(object? sender, OpenCvSharp.Mat mat)
    {
        if (_visionService == null || _decisionEngine == null) return;

        // Detect cards
        var cards = _visionService.DetectHoleAndBoard(mat);

        _currentState.HoleCards = cards.Take(2).ToList();
        _currentState.CommunityCards = cards.Skip(2).ToList();
        _currentState.OpponentCount = _visionService.DetectOpponentCount(mat);

        // Get recommendation
        var rec = _decisionEngine.GetRecommendation(_currentState);

        // Update UI on main thread
        DispatcherQueue.TryEnqueue(() =>
        {
            ActionText.Text = rec.Action;
            ReasonText.Text = rec.Reason;
            StatusText.Text = $"Opponents: {_currentState.OpponentCount} | Cards detected: {cards.Count}";
        });

        mat.Dispose();
    }

    private void StopCapture_Click(object sender, RoutedEventArgs e)
    {
        _captureService?.Stop();
        StartCaptureBtn.IsEnabled = true;
        StopCaptureBtn.IsEnabled = false;
        StatusText.Text = "Stopped";
    }

    // Simple helper - improve with proper window enumeration
    private IntPtr FindPokerWindow()
    {
        // TODO: Use Win32 FindWindow or EnumWindows to find PokerStars / GG Poker window
        // For testing: return Process.GetProcessesByName("pokerstars").FirstOrDefault()?.MainWindowHandle ?? IntPtr.Zero;
        return IntPtr.Zero; // Replace with real implementation
    }
}