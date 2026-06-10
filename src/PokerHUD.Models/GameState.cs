using System.Collections.Generic;

namespace PokerHUD.Models;

public class GameState
{
    public List<Card> HoleCards { get; set; } = new();
    public List<Card> CommunityCards { get; set; } = new();
    public int OpponentCount { get; set; }
    public string Street { get; set; } = "Preflop"; // Preflop, Flop, Turn, River
    public double Pot { get; set; }
    public List<double> Stacks { get; set; } = new();

    public bool IsValid() => HoleCards.Count == 2;
}