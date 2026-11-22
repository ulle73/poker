# Reproducerbara lokala Holdem-prov

Detta är kvalificering, inte en aktiv appadapter. Kräver den officiella
Holdem Solver0.93-appen och dess redan existerande lokala runner på127.0.0.1:8807.
Ingen kontocookie eller grant ska kopieras eller förändras.

```powershell
$env:POKER_HOLDEM_TOKEN_FILE='C:\Users\ryd\nlhe_solver_artifacts\runtime\product_services\product_solve_runner_api.token'
$env:POKER_HOLDEM_EVIDENCE='<egen arbetskatalog>\holdem-stream.json'
node docs/evidence/holdem-stream-2026-11-08/reproduce-live-stream.mjs poll
```

`poll` startar inget compute-jobb. Starta därefter ett syntetiskt återupptagnings-
prov i den officiellt inloggade UI-vägen. Scriptet upptäcker nästa nya jobb och
ställer dess dokumenterade strategy-watch till flop/entry_flop.check. Därför
ska inga andra jobb startas samtidigt. Körningen här använder3p,JhQhKh och
BB-hand9s9h. UI och extern klient delar ett watchval; granska observerad
historia och samples i resultatet. För andra modeller måste provparametrarna
anpassas uttryckligen; detta är inte generell routing för2–6.

`verify-auth` är ett **muterande startprov**: skickar ett normalt syntetiskt
POST/solve med3p,10000iterationer. I vår kvalificering nekades det403 innan
jobb skapades. Om åtkomsten ändrats kan ett riktigt jobb skapas; dess id
skrivs då ut. UI-/browserstatus i denna reproduktionsversion måste kontrolleras
separat. Statiska manuella observationer i external-auth-check.json gäller
den sparade körningen, inte varje framtida scriptkörning.

`snapshot ID`, `nodes ID` och `list` läser källans egna svar. Snapshot/noder
kan vara stora. Nyckeln läses i minnet och skickas endast som Bearer-header
till samma fasta loopbacktjänst; den skrivs inte till evidens eller klientkod.

Filer:

- early-watch.json: första provet, fel watch kvarstod, handrad kom sent.
- verified-watch.json: verifierad watch; första handrad är delvis ärvd.
- source-ui.txt: avmaskerat slutligt UI, fortsatt draft och proxyfel.
- external-auth-check.json: läsning200/nytt jobb403/extern sessionfalse.
- disk-space-summary.json: oförstörande komprimering och oförändrade hashvärden.

Ingen av mätserierna verifierar kallt nytt beslut på3,8s,2%-Nashkvalitet,
flop för2/4/5/6eller en aktuell hand från Edge. Se ../../holdem-stream-2026-11-08.md.
