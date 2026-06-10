# How to Create Good Card Templates

For VisionService (template matching) to work well, you need high-quality templates.

## Recommended Method

1. Open your poker client (PokerStars, GG Poker, etc.)
2. Make sure the table theme is the one you will use
3. Take clean screenshots of individual cards (use Snipping Tool or similar)
4. Crop tightly around each card
5. Save as PNG with transparent or solid background
6. Name them consistently:
   - `Ah.png` (Ace of Hearts)
   - `Ks.png` (King of Spades)
   - `10d.png` (Ten of Diamonds)
   - `Qc.png`, `Js.png`, etc.

## Tips for Best Results
- Use the exact same resolution and theme as during play
- Take multiple examples if cards have slight variations
- Test matching threshold in VisionService (currently ~0.82)
- Place all templates in one folder and point VisionService to it

Good templates = much higher detection accuracy.