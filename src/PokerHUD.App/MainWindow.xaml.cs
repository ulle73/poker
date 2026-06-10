using Microsoft.UI.Xaml;
using PokerHUD.Models;
using PokerHUD.Services;
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using OpenCvSharp;

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

        // TODO: Update this path to where you store your card templates
        string templatesPath = @"C:\PokerHUD\CardTemplates";
        _visionService = new VisionService(templatesPath);
        _decisionEngine = new DecisionEngine();
    }

    private async void StartCapture_Click(object sender, RoutedEventArgs e)
    {
        var hwnd = FindPokerWindow();

        if (hwnd == IntPtr.Zero)
        {
            StatusText.Text = "Could not find poker window. Make sure PokerStars / GG Poker is running.";
            return;
        }

        _captureService = new CaptureService();
        _captureService.FrameProcessed += OnFrameProcessed;

        bool started = await _captureService.StartCaptureAsync(hwnd);
        if (started)
        {
            StartCaptureBtn.IsEnabled = false;
            StopCaptureBtn.IsEnabled = true;
            StatusText.Text = "Capturing from poker window...";
        }
        else
        {
            StatusText.Text = "Failed to start capture. Check permissions and capabilities.";
        }
    }

    private void OnFrameProcessed(object? sender, Mat mat)
    {
        if (_visionService == null || _decisionEngine == null) return;

        try
        {
            var cards = _visionService.DetectHoleAndBoard(mat);

            _currentState.HoleCards = cards.Take(2).ToList();
            _currentState.CommunityCards = cards.Skip(2).ToList();
            _currentState.OpponentCount = _visionService.DetectOpponentCount(mat);

            var rec = _decisionEngine.GetRecommendation(_currentState);

            DispatcherQueue.TryEnqueue(() =>
            {
                ActionText.Text = rec.Action;
                ReasonText.Text = rec.Reason;
                StatusText.Text = $"Opponents: {_currentState.OpponentCount} | Detected cards: {cards.Count}";
            });
        }
        finally
        {
            mat.Dispose();
        }
    }

    private void StopCapture_Click(object sender, RoutedEventArgs e)
    {
        _captureService?.Stop();
        StartCaptureBtn.IsEnabled = true;
        StopCaptureBtn.IsEnabled = false;
        StatusText.Text = "Capture stopped";
    }

    // ==================== Find Poker Window (Win32) ====================
    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    private static extern IntPtr FindWindow(string? lpClassName, string lpWindowName);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);

    private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    private static IntPtr FindPokerWindow()
    {
        IntPtr foundHwnd = IntPtr.Zero;

        // Try common poker client window titles / class names
        string[] possibleTitles = { "PokerStars", "GGPoker", "PartyPoker", "888poker", "Winamax" };

        foreach (var title in possibleTitles)
        {
            foundHwnd = FindWindow(null, title);
            if (foundHwnd != IntPtr.Zero) return foundHwnd;

            // Also try partial match
            foundHwnd = FindWindowContaining(title);
            if (foundHwnd != IntPtr.Zero) return foundHwnd;
        }

        return IntPtr.Zero;
    }

    private static IntPtr FindWindowContaining(string partialTitle)
    {
        IntPtr result = IntPtr.Zero;

        EnumWindows((hWnd, lParam) =>
        {
            var sb = new StringBuilder(256);
            GetWindowText(hWnd, sb, sb.Capacity);
            string windowTitle = sb.ToString();

            if (windowTitle.Contains(partialTitle, StringComparison.OrdinalIgnoreCase))
            {
                result = hWnd;
                return false; // stop enumeration
            }
            return true; // continue
        }, IntPtr.Zero);

        return result;
    }
}