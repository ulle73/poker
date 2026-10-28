# Poker HUD & GTO Advisor

**Strong, optimized MVP is now in the repository.**

A Windows application that captures poker tables in real time, detects cards using computer vision (OpenCvSharp), and provides GTO-style recommendations.

## Current Status (Optimized MVP)

- Full CaptureService with working frame-to-Mat conversion
- VisionService with template matching + card parser
- DecisionEngine with equity estimation and action recommendations
- OcrService skeleton (Tesseract ready)
- Proper FindPokerWindow using Win32
- Basic WinUI overlay with live updates
- Good documentation and guides

The project is now in a state where you can build and test a functional version.

## Quick Start

1. Create a WinUI 3 Blank App in Visual Studio
2. Add NuGet packages: OpenCvSharp + Tesseract
3. Add graphicsCapture capability (see docs)
4. Create card templates (see docs/Card_Templates_Guide.md)
5. Copy the src/ files into your project
6. Update the templates path in MainWindow.xaml.cs
7. Run and test!

## Important Notes
- Card templates are critical for good detection quality.
- The DecisionEngine is simplified — replace with real TexasSolver JSON for production use.
- This is for educational/study purposes. Most poker sites prohibit screen reading tools.

See the docs/ folder for detailed guides.

---

Built iteratively with strong foundations from open-source projects like dickreuter/Poker and TexasSolver.