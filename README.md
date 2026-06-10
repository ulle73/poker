# Poker HUD & GTO Advisor

**Strong MVP foundation is now in the repo.**

Windows app that captures poker tables, detects cards via computer vision, and gives GTO-style recommendations.

## Current Status (as of latest commit)

- Models: Card + GameState
- Services: CaptureService (Windows.Graphics.Capture + frame-to-Mat), VisionService (OpenCvSharp template matching + card parser), DecisionEngine (simplified equity + rules)
- Basic WinUI overlay skeleton (MainWindow.xaml + .xaml.cs)
- Full project structure ready

You can now create the WinUI 3 project in Visual Studio, add the services, and test capture + basic detection.

## Quick Start

1. Clone repo
2. Create WinUI 3 Blank App in Visual Studio
3. Add NuGet: OpenCvSharp, Tesseract
4. Copy files from src/ into your project
5. Add graphicsCapture capability in manifest
6. Prepare card templates (see docs)
7. Run and test!

See docs/SETUP_INSTRUCTIONS.md and docs/PROGRESS.md for details.

**Important**: This is a powerful foundation. Full reliable detection requires good templates + tuning for your specific poker client theme and resolution.