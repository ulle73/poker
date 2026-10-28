# Setup Instructions - Poker HUD & GTO Advisor

## Prerequisites
- Windows 10 or 11
- Visual Studio 2022 or newer
  - Workloads: .NET desktop development + WinUI application development
- Git

## Step 1: Clone the Repository
```bash
git clone https://github.com/ulle73/poker.git
cd poker
```

## Step 2: Create the WinUI 3 Project
1. Open Visual Studio
2. Create a new project: **Blank App, Packaged (WinUI 3 in Desktop)**
3. Name it something like `PokerHUD.App`
4. Place it inside the `src/` folder or adjust paths accordingly

## Step 3: Add Required NuGet Packages
In your WinUI project, install:
- OpenCvSharp
- Tesseract (charlesw/tesseract or equivalent NuGet)
- Any additional helpers (e.g. for JSON, SQLite if needed)

## Step 4: Add Card Templates
Create screenshots of all card ranks and suits from your poker client (consistent theme and resolution).
Place them in `Resources/CardTemplates/` (we will add example structure).

## Step 5: Implement Core Services
We will push ready-made classes for:
- CaptureService.cs
- VisionService.cs (OpenCV template matching)
- OcrService.cs
- StateParser.cs
- DecisionEngine.cs
- OverlayWindow.xaml / MainWindow.xaml

## Next
Follow the commits in this repo. Each major module will be added with clear commit messages and instructions.

Start by running the basic WinUI app to verify setup, then we integrate capture.

**Questions or issues?** Open an issue in the repo.