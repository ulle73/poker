using OpenCvSharp;
using PokerHUD.Models;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace PokerHUD.Services;

public class VisionService : IDisposable
{
    private readonly Dictionary<string, Mat> _templates = new();
    private readonly string _templatesPath;

    public VisionService(string templatesPath)
    {
        _templatesPath = templatesPath;
        LoadTemplates();
    }

    private void LoadTemplates()
    {
        if (!Directory.Exists(_templatesPath)) return;

        foreach (var file in Directory.GetFiles(_templatesPath, "*.png"))
        {
            var key = Path.GetFileNameWithoutExtension(file);
            var img = Cv2.ImRead(file, ImreadModes.Color);
            if (!img.Empty())
                _templates[key] = img;
        }
    }

    public List<Card> DetectHoleAndBoard(Mat screenMat, Rect? holeRegion = null, Rect? boardRegion = null)
    {
        var cards = new List<Card>();

        // Detect hole cards (left side usually)
        var holeArea = holeRegion ?? new Rect(0, 0, screenMat.Width / 3, screenMat.Height);
        var holeMat = new Mat(screenMat, holeArea);
        cards.AddRange(DetectCardsInRegion(holeMat, isHole: true));

        // Detect community cards
        var boardArea = boardRegion ?? new Rect(screenMat.Width / 3, 0, screenMat.Width * 2 / 3, screenMat.Height);
        var boardMat = new Mat(screenMat, boardArea);
        cards.AddRange(DetectCardsInRegion(boardMat, isHole: false));

        return cards;
    }

    private List<Card> DetectCardsInRegion(Mat region, bool isHole)
    {
        var detected = new List<Card>();

        foreach (var (name, template) in _templates)
        {
            using var result = new Mat();
            Cv2.MatchTemplate(region, template, result, TemplateMatchModes.CCoeffNormed);
            Cv2.MinMaxLoc(result, out _, out double maxVal, out _, out _);

            if (maxVal > 0.82) // Tune this threshold per your client/theme
            {
                var card = ParseCardFromTemplateName(name);
                if (card != null) detected.Add(card);
            }
        }

        return detected.Distinct().ToList(); // Remove duplicates
    }

    private Card? ParseCardFromTemplateName(string name)
    {
        // Expected naming: "Ah.png", "Ks.png", "10d.png" etc.
        // Implement robust parser here
        if (name.Length < 2) return null;

        var rankStr = name[..^1];
        var suitChar = name[^1];

        Rank rank = rankStr.ToLower() switch
        {
            "a" or "ace" => Rank.Ace,
            "k" or "king" => Rank.King,
            "q" or "queen" => Rank.Queen,
            "j" or "jack" => Rank.Jack,
            "10" or "t" => Rank.Ten,
            _ when int.TryParse(rankStr, out int r) => (Rank)r,
            _ => Rank.Two
        };

        Suit suit = suitChar.ToLower() switch
        {
            'h' => Suit.Hearts,
            'd' => Suit.Diamonds,
            'c' => Suit.Clubs,
            's' => Suit.Spades,
            _ => Suit.Hearts
        };

        return new Card(rank, suit);
    }

    public int DetectOpponentCount(Mat screenMat)
    {
        // TODO: Implement using seat detection, color blobs, or OCR on player areas
        // For MVP: return a fixed number or simple contour count
        return 5; // Placeholder
    }

    public void Dispose()
    {
        foreach (var t in _templates.Values) t.Dispose();
    }
}