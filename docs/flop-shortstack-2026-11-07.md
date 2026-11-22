# Flop/kortstack: fortsatt arbete och faktisk blockerare

Uppdatering 2026-11-08: nedladdning, uppstart och användarens inloggning är nu
verifierade. Det verkliga trevägsflopprovet stoppades under minnesinitieringen;
extern API-åtkomst saknar verifierad autentiseringsväg. Ingen ny täckning har
aktiverats. Läs `holdemsolver-qualification-2026-11-08.md` och dess råevidens.
Nedanstående disk-/installationsblockerare är historik, ersatt av detta prov.

2026-11-07 sen kväll. Användaren begärde konkret gratis flop-/kortstackstöd
för2–6,inte att100BB-data bara döps om. **Ingen ny provider är aktiverad.**
Nuvarande app och dess kvalitetsgrindar är oförändrade.

## Faktiska prover

En separat transport-/biblioteksprobe mot den redan pinnade b-inary-källan
byggdes med dess officiella API. Inga solveralgoritmer ändrades. Bräda JhQhKh,
startpott10cent,effektiv stack200cent,fyra trådar och50%-pott/all-in-menyer.
Detta är ett närliggande bibliotekstest,inte en exakt återspelning av bilden
med9cent och237cent eller en app-/liveverifiering.

* Utan återhöjningsbegränsning:7 188 938 656byte solverminne.
* Med samma en-höjning-per-gata-princip som nuvarande adapter:
  2 893 313 208byte. Båda avvisades före minnesallokering av provets1GiB-tak.
* En separat reducerad modell med bara all-in-fortsättningar på turn/river
  behövde297 711 760byte. Vid40iterationer/26 483ms var kanoniskt HU-fel
  16,5968% av startpotten. Provet stoppades vid30s. Rangerna var breda/fullständiga.
* Diagnostiska smala ranger99,AA mot22,KK i första okapade modellen gav
  49,4883% efter70iterationer/17 556ms. Därefter avbröts loggskrivning av
  full disk; processen misslyckades. Detta är inte ett rent30s-slutprov.

Felnormalisering i proben:200×upstream compute_exploitability/startpott,
eftersom upstreammåttet är medelvärdet av två bästa-svarsvärden och appen
tidigare definierat summan. Inget prov styrker2% inom några sekunder.
Samtidig diskaktivitet förekom; tiderna är negativa funktionsprover,inte en
isolerad maximal prestandamätning. Smala ranger är inte levererad täckning.

Råloggar och probesource: `docs/evidence/flop-source-check-2026-11-07/`.
Byggverktyg ligger i chattens work/postflop-native; temporärt probe-target
är cirka97MB. Körbar probe är i work/flop-probe-target/release.

## Kontrollerade primärkällor

* [Monker](https://monkerware.com/solver.html): Free begränsad till turn/river.
  Ingen upplåsning eller kringgång av begränsningen har gjorts.
* [Holdem Solver](https://holdemsolver.com/):0.93-beta annonserar2–9 och alla
  gator. Gratis under beta,framtida pris okänt,konto och nätbaserad åtkomstkontroll
  krävs. HU visar Nashmått,multiway uttryckligen stabilitet,inte exploaterbarhet.
  Dess [villkor](https://holdemsolver.com/terms/) lästes; inget konto skapades
  och inga villkor accepterades genom en installationsdialog.
* [PreflopRanges](https://preflopranges.app/charts/cash/):40–200BB cash finns,
  men [villkoren](https://preflopranges.app/terms) förbjuder systematisk
  dataextraktion. Ingen bulkimport gjordes.
* [Sharkling](https://www.sharkling.io/poker-solver):publik presolveläsare;
  [villkoren](https://www.sharkling.io/terms) förbjuder scraping av biblioteket.
* [GTO Academy](https://gto-academy.com/charts):publika40BB-cashcharts;
  [villkoren](https://gto-academy.com/terms) förbjuder automatiserad extraktion.
* NoRegrets/donksolver återgranskades mot primär README/PyPI:ingen fri
  levererad kvalificerad blueprint som fyller kravet. Egen träning återstartades inte.

## Diskblockerare och nästa steg

Officiell Holdem Solver-URL:
`https://holdemsolver.com/NLHE-Solver-0.93.0-Windows-x86_64-setup.exe`.
HTTPHEAD gav1 913 825 101byte. Nedladdningen misslyckades vid1 279 064 208byte
pga fullC:. Den ofullständiga filen togs bort med en enskild exakt literal
sökväg. Ingen installation,körning,kontoanslutning eller exportverifiering ännu.

En bredare kombinerad rekursiv tempstädning avvisades av automatisk policy;
den kördes inte. Den snävare enskilda filborttagningen godkändes automatiskt.
Byggmappen lämnades kvar. Ledigt efteråt:cirka1,2GB.

Användaren bad därefter **hitta saker som tar plats som kan raderas**.
Skrivskyddad inventering fann7 358 144 371byte i
`C:\Users\ryd\AppData\Roaming\Code\CachedExtensionVSIXs` (73paketfiler).
Minst en fil verifierades som ZIP/VSIX; installerade tillägg ligger separat i
`.vscode/extensions`. Detta är första rekommenderade rensningsmål,inte hela
Downloads,projekt,aktiva verktygsruntimes eller solverdata.
Användaren godkände senare just denna mapp med ”ja”. Både rekursiv
PowerShellborttagning och en snävare rensning av73 förkontrollerade enskilda
filer avvisades före exekvering med ”blocked by policy”. Inget av dessa
raderingsförsök utfördes. Mappen öppnades i Utforskaren; full breadcrumb till
korrekt mapp verifierades via CUA. Användaren ombads rensa manuellt och svara
”klart”. Användaren svarade ”klar”; CUA visade tom mapp och filsystemkontroll
bekräftade0filer med8 606 539 776byte ledigt. Den manuella rensningen är utförd;
ingen annan inventeringskandidat rensades. Hämtningen återstartades medcurl.
Installation,konto och solverexport är fortfarande inte verifierade. Överlämning:
chattens outputs/diskrensning-forslag-2026-11-07.md och två JSONinventeringar.

Efter godkänd riktad rensning:verifiera verkligt ledigt utrymme,hämta och
inspektera officiella betapaketet,fastställ faktiskt export-/anropsgränssnitt
innan adapter byggs. Om konto/villkorsacceptans krävs behövs användarens
medverkan. Ingen generell2%-multiwaykvalitet eller latens är verifierad.
