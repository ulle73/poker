# Poker HUD & GTO Advisor

Windows desktop application that reads online poker tables via screen capture, detects your hole cards, community cards, and number of opponents using computer vision + OCR, and provides real-time GTO (Game Theory Optimal) decision recommendations.

**Repo created for building a powerful, stealth-friendly poker study and in-game assistant tool.**

## Project Status

- **Current phase**: Initial structure + core services skeletons (Capture + Vision)
- **Target stack**: C# .NET 8 + WinUI 3 (main app) + OpenCvSharp + Tesseract.NET
- **Hybrid option**: Python backend (inspired by proven open-source scrapers) communicating with C# UI

**Latest progress**: Added models and basic CaptureService + VisionService skeletons. Ready for integration into a WinUI 3 project.

## Key Features (MVP Roadmap)

### MVP Goals
- Screen/window capture of poker tables (PokerStars first target)
- Computer vision detection of:
  - Your 2 hole cards (rank + suit)
  - Community cards (flop/turn/river)
  - Number of opponents
- Basic game state extraction
- GTO/Equity advice display (preflop ranges + postflop Monte Carlo + simplified actions)
- Clean overlay or side panel UI
- Configurable per-site table mapping

### Future Phases
- Full TexasSolver integration (precomputed strategies as JSON)
- Advanced OCR for bets/stacks/pot
- Multi-table support
- Logging & hand review
- Stealth optimizations & VM-friendly design

## Tech Stack & Architecture

**Recommended Primary Stack**
- **C# .NET 8 + WinUI 3** – Modern native Windows app with excellent overlay support
- **OpenCvSharp** – Computer vision & template matching for cards
- **Tesseract.NET** – OCR for text elements
- **Windows.Graphics.Capture** + Win32 API – Fast screen/window capture
- **Decision Engine**: Monte Carlo equity (MVP) + precomputed GTO from TexasSolver

**Why this combo?**
- Leverages the strongest open-source components for the hard parts (reliable screen-to-state extraction)
- Delivers a polished, high-performance Windows experience
- Good balance between development speed and final quality

**Alternative (faster prototype)**: Pure Python with OpenCV + Tesseract + customtkinter, then port key modules to C#.

## Core Repositories & Resources We Build Upon

### Primary Scraping / CV Foundation
- **dickreuter/Poker** (highly recommended base): https://github.com/dickreuter/Poker
  Full Python poker bot with OpenCV screen scraping, Tesseract OCR, table mapping GUI, Monte Carlo equity. Supports PokerStars, GG Poker, PartyPoker.
  → Fork and extract the scraper/recognizer modules (remove auto-play parts).

- **wb-08/PokerVision**: https://github.com/wb-08/PokerVision
  Python + OpenCV focused on PokerStars table entity recognition.

### GTO Solver
- **TexasSolver** (best open-source GTO): https://github.com/bupticybee/TexasSolver
  Efficient C++ Texas Hold'em solver. Use offline to generate strategies → export JSON for fast lookup in the app.

### C# Helpers & Examples
- OpenCvSharp (NuGet package)
- Tesseract.NET: https://github.com/charlesw/tesseract
- Card detection logic inspiration: https://github.com/edjeelectronics/opencv-playing-card-detector

### Architecture Inspiration
- Poker Vision pipeline description: https://azbvision.github.io/PokerVision/
  (Eye → Reader → Players & State → Analysis & Equity)

## Project Structure (Current)

```
src/
├── PokerHUD.Models/
│   ├── Card.cs
│   └── GameState.cs
├── PokerHUD.Services/
│   ├── CaptureService.cs
│   └── VisionService.cs   # Skeleton with template matching guidance
└── PokerHUD.App/          # Your WinUI 3 project goes here

Resources/
└── CardTemplates/       # Add your PNG templates here (one per rank+suit)
```

## Getting Started (Setup Instructions)

### Prerequisites
- Windows 10/11
- Visual Studio 2022 or newer with:
  - .NET desktop development workload
  - WinUI application development workload
- Git

### Step-by-Step
1. Clone this repo
2. Open Visual Studio and create a new **WinUI 3 Blank App, Packaged** project (name it e.g. `PokerHUD.App`)
3. Add the NuGet packages:
   - `OpenCvSharp`
   - `Tesseract` (from charlesw or equivalent)
4. Copy the files from `src/PokerHUD.Models` and `src/PokerHUD.Services` into your project
5. Add required capabilities in Package.appxmanifest (see below)
6. Start implementing the services (examples provided)

### Required App Capabilities (Package.appxmanifest)
Add these under `<Capabilities>`:
```xml
<Capability Name="internetClient" />
<rescap:Capability Name="graphicsCapture" />
<rescap:Capability Name="graphicsCaptureWithoutBorder" />
```
(Also add the namespace: `xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"`)

We will continue pushing ready-to-use and well-commented service classes.

## Important Warnings

**Legal & Account Risk**
Most online poker sites (PokerStars, GG Poker, etc.) prohibit the use of external screen-reading tools and bots. Using this software may result in account bans or other penalties.

This project is intended for **educational and personal study purposes** only. Use at your own risk.

**Detection**
Poker rooms use process scanning, behavioral analysis, window detection, and sometimes desktop inspection. Recommendations for reducing risk will be added.

## Next Steps
We build iteratively. Current focus: Get capture + basic vision working.

Follow the commits!

---

Built iteratively with Grok. Strong foundation from dickreuter/Poker + TexasSolver.