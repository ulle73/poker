# Poker HUD & GTO Advisor - Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** 2026-06-10  
**Status:** Draft for implementation

## 1. Executive Summary

A Windows desktop application that captures the screen of online poker tables, uses computer vision and OCR to extract your 2 hole cards, community cards, number of opponents, and provides real-time or near real-time GTO decision recommendations via overlay or side panel.

**MVP Goal:** Working screen capture + card detection for one poker site (PokerStars recommended first) + basic equity/GTO advice display.

## 2. Problem Statement & Goals

**Problem:** Players want real-time GTO assistance without manual solver lookups.

**Goals:**
- Automate table state extraction from visual data.
- Deliver actionable GTO-informed advice quickly.
- Support multiple sites via configurable mapping.
- Good performance.
- Allow learning by seeing suggestions.

## 3. Key Features (MVP)
- Screen/window capture
- CV detection of hole cards, community cards, opponents
- Basic state parsing
- GTO/Equity advice (preflop + postflop)
- Overlay or side panel UI
- Per-site templates
- Logging

## 4. Technical Requirements
- Windows 10/11
- Real-time analysis
- Stealth considerations
- Modular design

## 5. Recommended Tech Stack
C# .NET 8 + WinUI 3 + OpenCvSharp + Tesseract.NET + Windows.Graphics.Capture

Hybrid Python backend option available.

## 6. Repositories & Resources
- dickreuter/Poker: https://github.com/dickreuter/Poker
- TexasSolver: https://github.com/bupticybee/TexasSolver
- wb-08/PokerVision: https://github.com/wb-08/PokerVision
- OpenCvSharp, Tesseract.NET

(Full details in the project README and development discussions)

## 7. Risks
High legal/account risk on most poker sites. For educational use primarily. Use at your own risk.

---

*This PRD is the foundation for building the app iteratively in this repository.*