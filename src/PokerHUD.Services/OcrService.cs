using Tesseract;
using System;
using System.IO;

namespace PokerHUD.Services;

// OCR Service using Tesseract for reading bet sizes, stacks, pot, etc.
// Requires tessdata folder with language files (download from https://github.com/tesseract-ocr/tessdata)

public class OcrService : IDisposable
{
    private readonly TesseractEngine _engine;

    public OcrService(string tessDataPath = "tessdata")
    {
        if (!Directory.Exists(tessDataPath))
            throw new DirectoryNotFoundException($"tessdata folder not found at: {tessDataPath}");

        _engine = new TesseractEngine(tessDataPath, "eng", EngineMode.Default);
    }

    public string ReadText(OpenCvSharp.Mat imageRegion)
    {
        try
        {
            using var pix = Pix.LoadFromMemory(imageRegion.ToBytes(".png"));
            using var page = _engine.Process(pix);
            return page.GetText().Trim();
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"OCR error: {ex.Message}");
            return string.Empty;
        }
    }

    public void Dispose()
    {
        _engine?.Dispose();
    }
}