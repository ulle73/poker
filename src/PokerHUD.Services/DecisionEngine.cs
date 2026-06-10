using PokerHUD.Models;
using System;
using System.Collections.Generic;

namespace PokerHUD.Services;

public class DecisionEngine
{
    // Simple Monte Carlo equity + basic GTO-inspired rules for MVP
    // For production: Replace with precomputed TexasSolver JSON or full solver call

    public Recommendation GetRecommendation(GameState state)
    {
        if (!state.IsValid())
            return new Recommendation("Fold", 0, "Invalid state");

        // Very simplified logic for demonstration
        var equity = CalculateSimpleEquity(state);

        if (state.Street == "Preflop")
        {
            if (equity > 0.35)
                return new Recommendation("Raise", 2.5, $"Strong hand - raise ~2.5x (Equity ~{equity:P0})");
            if (equity > 0.20)
                return new Recommendation("Call", 1.0, $"Playable - call (Equity ~{equity:P0})");
            return new Recommendation("Fold", 0, $"Weak - fold (Equity ~{equity:P0})");
        }

        // Postflop simplified
        if (equity > 0.55)
            return new Recommendation("Bet/Raise", 0.75, $"Strong - bet ~75% pot (Equity ~{equity:P0})");
        if (equity > 0.35)
            return new Recommendation("Call", 1.0, $"Decent equity - call (Equity ~{equity:P0})");

        return new Recommendation("Fold", 0, $"Low equity - fold (Equity ~{equity:P0})");
    }

    private double CalculateSimpleEquity(GameState state)
    {
        // Placeholder Monte Carlo style equity
        // In real version: Use a proper hand evaluator + random simulation
        // For now: very rough estimate based on hand strength
        if (state.HoleCards.Count != 2) return 0.1;

        var highCard = (int)state.HoleCards.Max(c => c.Rank);
        var suited = state.HoleCards[0].Suit == state.HoleCards[1].Suit;

        double equity = highCard / 14.0 * 0.6;
        if (suited) equity += 0.1;
        if (state.CommunityCards.Count > 0) equity += 0.15; // Made hand bonus

        return Math.Clamp(equity, 0.05, 0.95);
    }
}

public record Recommendation(string Action, double Sizing, string Reason);