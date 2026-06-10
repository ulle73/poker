# Poker HUD & GTO Advisor

Windows desktop application that reads online poker tables via screen capture, detects your hole cards, community cards, and number of opponents using computer vision + OCR, and provides real-time GTO (Game Theory Optimal) decision recommendations.

**Repo created for building a powerful, stealth-friendly poker study and in-game assistant tool.**

## Project Status

- **Current phase**: Initial setup & architecture
- **Target stack**: C# .NET 8 + WinUI 3 (main app) + OpenCvSharp + Tesseract.NET
- **Hybrid option**: Python backend (inspired by proven open-source scrapers) communicating with C# UI

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

## Project Structure (Planned)

```
PokerHUD/
├── README.md
├── .gitignore
├── docs/
│   └── PRD_Poker_HUD_GTO_Advisor.md
├── src/
│   ├── PokerHUD.App/          # WinUI 3 main project
│   ├── PokerHUD.Services/     # Capture, Vision, OCR, State, Decision
│   └── PokerHUD.Models/       # GameState, Card, Recommendation etc.
└── Resources/
    └── CardTemplates/       # PNG templates for ranks & suits
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
2. Open Visual Studio and create a new **WinUI 3 Blank App, Packaged** project named `PokerHUD.App` (or similar)
3. Add the following NuGet packages:
   - OpenCvSharp
   - Tesseract (or Tesseract.NET)
   - Other helpers as needed
4. Copy the source files we will add to this repo into your project
5. Add your own card template images (screenshots from your poker client) to `Resources/CardTemplates/`
6. Implement the modular services (CaptureService, VisionService, etc.)

We will push ready-to-use service classes and examples directly to this repo.

## Important Warnings

**Legal & Account Risk**
Most online poker sites (PokerStars, GG Poker, etc.) prohibit the use of external screen-reading tools and bots. Using this software may result in account bans or other penalties.

This project is intended for **educational and personal study purposes** only. Use at your own risk.

**Detection**
Poker rooms use process scanning, behavioral analysis, window detection, and sometimes desktop inspection. Full undetectability is difficult. Recommendations for reducing risk (VM usage, neutral naming, side-panel UI instead of obvious overlays, no input automation) will be documented.

## Next Steps in This Repo

We are building this iteratively:
1. Initial structure & documentation (current commit)
2. Core capture + basic CV/OCR modules
3. Game state parser + simple decision engine
4. WinUI overlay/panel UI
5. Per-site mapping & TexasSolver integration

Follow the commits and issues for progress.

## Contributing
This is a personal development project. Feel free to open issues or suggest improvements.

---

Built with assistance from Grok. Strong focus on using the best open-source foundations (dickreuter/Poker, TexasSolver, etc.).