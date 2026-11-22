# Beslutsgräns på tio sekunder och okänt deltagande

En starthändelse i den lokala mottagaren bär tidsstämpeln genom leverantörsval, beräkning och UI. Identiska avläsningar förnyar färskheten och behåller starttiden. Ett ändrat beslut, återanslutning efter inaktualitet eller en ändrad range kan starta en ny tidsbudget. Vid gränsen avbryts jobbet. En tidskontroll vid mottaget resultat och en andra före den första visningen undertrycker sena strategisvar. Ett redan publicerat råd kvarstår så länge samma läge är färskt. Nya händer, inaktualitet och felaktiga avläsningar döljer råd. Windows schemaläggning och den fysiska skärmens uppdatering har ingen hård realtidsgaranti.

## Återspelad sexstolsflop

Anonymiserat läge rekonstruerat från användarens bild. A♥ J♦ på 2♥ 8♥ Q♦. Pott 0,13 EUR, tre synligt aktiva, ett säte foldat, ett står över och ett saknar säkert deltagandebesked. Synliga knappar är Fold, Check och Satsa. Ett tidigare fel kopplade visningen av alla val till att hela solvermodellen kunde skapas. Den nya beslutsrutan läser knappar, tur och insatser direkt för det färska läget. Den anger vilket säte som är oklart. Om det går att checka gratis medan strategin saknas kan hjälten få **Försiktigt träningsval · Check**. Detta är ett konkret val för att behålla handen utan att riskera fler marker på denna handling. Ingen EV-rangordning, motståndarprofil eller frekvens tilldelas träningsvalet. Vid en satsning som kräver syn visas i stället de avlästa alternativen och synpriset när uppgifterna räcker.

Från mottagning till kontrollerad synlig text och fönsterbild för det nya handnumret tog det 987 ms kallt och 68 ms varmt. Ingen solverrekommendation genererades i detta test. [Rådata](uncertain-seat-flop-3.json) · [Bild](uncertain-seat-flop-3.png)

## Turn med 2–6 spelare

En separat paketerad app per antal aktiva. Kall är första handen i processen. Varm är ett nytt handnummer med oförändrat modellinnehåll. Mätning från mottagning av färsk hand till kontroll av rätt handnyckel och rekommendation i fönstrets bildruta. Samtliga råfiler innehåller indata, handlingar och kvalitetsmärkning. Ett prov per temperatur och fall.

| Aktiva | Kall tid | Varm tid | Kvalitet |
|---|---:|---:|---|
| [2](turn-2.json) | 6198 ms | 68 ms | Solverstrategi · 2 % felgräns |
| [3](turn-3.json) | 6265 ms | 70 ms | Monker · felgräns ej verifierad |
| [4](turn-4.json) | 5293 ms | 134 ms | Monker · felgräns ej verifierad |
| [5](turn-5.json) | 5332 ms | 136 ms | Monker · felgräns ej verifierad |
| [6](turn-6.json) | 7324 ms | 101 ms | Monker · felgräns ej verifierad |

Intel i5-11300H, åtta logiska processorer, 15,7 GiB RAM och Windows build 26200 med Electron 45.1.0. Heads-up använder två breda ranger och b-inary i det begränsade trädet med 2 % felmål. Monker Free använder topp 50 % för hjälten och fulla motståndarranger. 3–6-spelarproven saknade verifierad felgräns. Tiderna för turn mättes före en efterföljande formulering av sätets status och extra validering av handens kort. Sexstolsfloppen kördes om i slutpaketet. Den aktuella versionen startades och dess ordinarie mottagare på 47832 samt texten ”Live · uppdateras automatiskt” kontrollerades med Windows UI Automation. Ingen spelhandling utfördes.

En första skärmbild visade föregående tomma bildruta trots korrekt text i DOM. Mätverktyget väntar nu på två bildrutor och kontrollerar handen igen. Slutbilden granskades visuellt. Den här ändringen gäller mätverktyget. [Checklista för alla gator och spelarantal](../../CHECKLISTA.md) · [SEK preflop](sek-preflop-2.json) · [SEK river](sek-river-2.json)
