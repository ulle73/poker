using OpenCvSharp;
using PokerHUD.Models;
using System;
using System.Collections.Generic;
using System.IO;

// VisionService - Computer Vision for poker table analysis
// Uses OpenCvSharp (OpenCV wrapper) for template matching on cards

namespace PokerHUD.Services;

public class VisionService
{
    private readonly Dictionary<string, Mat> _cardTemplates = new();

    public VisionService(string templatesPath)
    {
        LoadTemplates(templatesPath);
    }

    private void LoadTemplates(string path)
    {
        // Load all card templates (e.g. "Ah.png", "Ks.png", etc.)
        // Recommended: Take clean screenshots of every card in your poker client's theme
        foreach (var file in Directory.GetFiles(path, "*.png"))
        {
            var name = Path.GetFileNameWithoutExtension(file);
            _cardTemplates[name] = Cv2.ImRead(file, ImreadModes.Color);
        }
    }

    public List<Card> DetectCards(Mat screenRegion)
    {
        var detected = new List<Card>();

        foreach (var (name, template) in _cardTemplates)
        {
            // Simple template matching example
            using var result = new Mat();
            Cv2.MatchTemplate(screenRegion, template, result, TemplateMatchModes.CCoeffNormed);

            Cv2.MinMaxLoc(result, out _, out double maxVal, out _, out Point maxLoc);

            if (maxVal > 0.85) // Confidence threshold - tune this!
            {
                // Parse name to Rank + Suit (implement your own parser)
                var card = ParseCardName(name);
                if (card != null) detected.Add(card);
            }
        }

        return detected;
    }

    private Card? ParseCardName(string name)
    {
        // Example: "Ah" -> Ace of Hearts
        // Implement proper parsing based on your template naming
        try
        {
            // Simple example logic - expand this
            return null; // TODO: Implement full parser
        }
        catch
        {
            return null;
        }
    }

    // TODO: Add methods for detecting number of opponents, pot, etc.
    // Use contours, color detection, or OCR (Tesseract) for text areas
}