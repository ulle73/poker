# Flopbeslut i Windows den 21 november 2026

## Öppen satsning med två aktiva

Egen studie läser 74 källträd med tio nåbara beslutslägen vardera. De gäller 52-korts NLHE, sex utdelade, 100 BB, öppning från knappen till 2,5 BB och syn från BB. Potten är 5,5 BB före första flopbeslutet. De fördefinierade rangerna och satsningsstorlekarna hör till just denna prefloplinje. Spelaren kan välja exakt hand för den som är på tur. Modellen startar med BB:s beslut och omfattar även checkad pott, bet, höjning och all-in.

60 brädor kommer från det publicerade provarkivet. 14 ytterligare brädor med bland annat ess, klädda kort, par och färgdrag kommer från utgåvan library-v1. Installationen hämtar exakt de angivna byteintervallen från utgivaren och kontrollerar SHA-256 för varje komprimerad fil. Uppslag under träning sker på datorn. Arkivets SHA-256 är 566491de46565bd74251e06aa24e4febaa512adc505457ea99445847cdf66069. Utgivarens fullständiga index för denna modell innehåller 1 755 kanoniska brädor. Den installerade täckningen är 74 angivna brädor. [Källbibliotekets modell](https://github.com/RubberDucke825/PokerNow-Analysis-and-Trainer/blob/3cffd72966c933949c253bfb24ee4de3e4d5d2db/docs/flop-library.md)

TexasSolver rapporterar ett uppnått genomsnittligt bästa-svarsmått mellan 0,2951 och 0,9993 procent av startpotten, beroende på bräda. Varje fil har stopporsaken converged. Måttet avser hela källans begränsade träd. Exporten saknar strategier för senare gator och innehåller inga EV per handling. Det går därför inte att oberoende återberäkna hela trädets felgräns från exporten. I appen står det **TexasSolver · källreferens**. [Utgivarens definition](https://github.com/RubberDucke825/PokerNow-Analysis-and-Trainer/blob/3cffd72966c933949c253bfb24ee4de3e4d5d2db/docs/exploitability.md)

På A♣ K♦ J♣ med K♥ 7♣ på knappen, efter BB:s check, visade Windows-appen check 12,84 %, satsning 1,82 BB 87,16 % och all-in under 0,01 %. Varje visad frekvens kontrollerades mot rätt hålkort i källfilen. Det här är ett konfigurerat träningsexempel. Samma prefloplinje och modellstackar fastställdes aldrig för användarens tidigare skärmbild. [Windows-bild](study.png)

Kall programstart med ny profil till kontrollerade frekvenser och två bildrutor tog 2 303 ms. Sex varma byten av linje eller bräda tog 119–228 ms. De inkluderar val, avläsning av faktisk hand och frekvenser i UI samt två bildrutor. Detta är en uppspelningsmätning med installerade filer. [Indata och enskilda tider](study.json)

## Avslutande syn eller fold med 2–6 utdelade

Automatmotorn jämför nu ett styrkt intervall för pottandelen med synpriset. Med flera spelare ska varje utdelad motståndare vara kvar och all-in för samma positiva flopinsats. Olikstora insatser och tidigare foldar ligger utanför provet. Vid eventuell översatsning ingår bara den del av varje insats som hjälten kan vinna.

För en bestämd tilldelning till m motståndare finns D = (47 − 2m)(46 − 2m) halva utfall för de två återstående korten. Exakt jämförelse mot en ensam motståndare ger lägsta och högsta pottandel mätt i enheter om 1/1980, L och H. Gemensamma runouts är en delmängd av varje enskild jämförelses runouts. Vid varje utfall begränsas hjältens andel uppåt av andelen mot varje enskild motståndare. Förlusten från en hel pott begränsas uppåt av summan av de enskilda förlusterna, även vid delning. Därför ligger andelen mellan max(0, D − m(1980 − L))/D och min(D, H)/D. Endast strikt bättre syn eller fold accepteras. Beräkningsmodellen är chip-EV utan rake.

Den paketerade appen tog emot ett syntetiskt komplett beslutsläge med A♥ A♠ på A♣ A♦ K♣. Varje motståndare hade satsat 0,40 och hade noll kvar. I varje test visades syn 0,40. En ny process användes för varje spelarantal, sedan återspelades läget med nytt handnummer i samma process. Tiden går från mottagning till kontrollerad synlig bildruta.

| Utdelade och aktiva | Kall | Varm |
|---|---:|---:|
| [2](closing-all-in-flop-2.json) | 1 305 ms | 1 065 ms |
| [3](closing-all-in-flop-3.json) | 1 223 ms | 1 087 ms |
| [4](closing-all-in-flop-4.json) | 1 212 ms | 1 076 ms |
| [5](closing-all-in-flop-5.json) | 1 213 ms | 1 084 ms |
| [6](closing-all-in-flop-6.json) | 1 219 ms | 1 091 ms |

Windows 10.0.26200, Intel Core i5-11300H, åtta logiska processorer, 16 GB installerat RAM och Electron 45.1.0. Testerna krävde inget öppet pokerbord. Vanligt öppet flopspel med 3–6 aktiva saknar fortfarande kvalificerad strategi. Den publicerade HU-källan omfattar två kvar i potten. Installationen tillför inte en generell automatisk strategi efter en check vid ett anslutet bord.
