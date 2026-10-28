# Development Progress Log

## 2026-06-10 - Commit 2
- Added initial models (Card, GameState)
- Added CaptureService.cs skeleton using Windows.Graphics.Capture
- Added VisionService.cs skeleton with OpenCvSharp template matching example
- Updated README and structure

**Next immediate tasks:**
- Improve CaptureService (handle frame to Mat conversion for OpenCV)
- Implement basic template matching + test on real screenshots
- Create simple WinUI overlay window
- Add Tesseract OCR integration for text elements

User should now create the WinUI 3 project in Visual Studio and test the capture capability.