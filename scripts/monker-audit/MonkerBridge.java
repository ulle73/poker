package c;
import java.io.*;
import java.lang.reflect.Field;
import java.nio.charset.*;
import java.nio.file.*;
import java.util.*;
import java.util.zip.*;

/** Local data-only bridge. No window/controller or modified solver algorithm.
 * The caller separately checks model identity, legality and quality. */
public class MonkerBridge {
 static final Charset ZIP=Charset.forName("UTF-16");
 static class Request {
  int players,street,pot,minBet,hero;int[] prefix,stacks;byte[] tree;
  List<String> board=new ArrayList<>(),heroCards=new ArrayList<>();double[][] ranges;
 }
 static String key(String cards){String[] a={cards.substring(0,2),cards.substring(2)};Arrays.sort(a);return String.join("",a);}
 static int app(int vendor,int n){return (vendor-1+n)%n;}
 static Request read(Path file)throws Exception {
  if(Files.size(file)>512000)throw new IOException("Request too large");
  Request r=new Request();
  try(DataInputStream in=new DataInputStream(Files.newInputStream(file))){
   if(in.readInt()!=0x4d4b5231)throw new IOException("Request magic");
   r.players=in.readInt();r.street=in.readInt();r.pot=in.readInt();r.minBet=in.readInt();r.hero=in.readInt();int prefix=in.readInt();
   if(r.players<3||r.players>6||r.street<2||r.street>3||r.pot<=0||r.minBet<=0||r.hero<0||r.hero>=r.players||prefix<0||prefix>12)throw new IOException("Request shape");
   r.prefix=new int[prefix];for(int i=0;i<prefix;i++)r.prefix[i]=in.readInt();
   r.stacks=new int[r.players];long total=r.pot;for(int i=0;i<r.players;i++){r.stacks[i]=in.readInt();if(r.stacks[i]<=0)throw new IOException("Stack");total+=r.stacks[i];}
   if(total>1000000)throw new IOException("Chip budget");
   for(int i=0;i<r.street+2;i++)r.board.add(in.readUTF());
   for(int i=0;i<2;i++)r.heroCards.add(in.readUTF());
   Set<String> cards=new HashSet<>(r.board);for(String card:r.heroCards)if(!cards.add(card))throw new IOException("Duplicate visible card");
   for(String card:cards)if(!card.matches("[2-9TJQKA][shdc]"))throw new IOException("Invalid card");
   double[] ones=new double[1326];Arrays.fill(ones,1);h[][] all=new aZ(ones).d();Map<String,Integer> indexes=new HashMap<>();
   for(int j=0;j<all.length;j++)indexes.put(key(all[j][0].toString()+all[j][1].toString()),j);
   r.ranges=new double[r.players][1326];
   for(int p=0;p<r.players;p++){
    int count=in.readInt();if(count<1||count>1326)throw new IOException("Range size");Set<String> seen=new HashSet<>();
    for(int j=0;j<count;j++){
     String holding=in.readUTF();double weight=in.readDouble();
     if(!holding.matches("([2-9TJQKA][shdc]){2}")||!Double.isFinite(weight)||weight<=0||weight>1)throw new IOException("Range entry");
     String k=key(holding);Integer index=indexes.get(k);
     if(index==null||!seen.add(k)||r.board.contains(holding.substring(0,2))||r.board.contains(holding.substring(2)))throw new IOException("Range blocker/duplicate");
     r.ranges[(p+1)%r.players][index]=weight;
    }
   }
   int size=in.readInt();if(size<30||size>100000)throw new IOException("Tree size");r.tree=in.readNBytes(size);
   if(r.tree.length!=size||in.read()!=-1)throw new IOException("Truncated/trailing request");
  }
  try(DataInputStream in=new DataInputStream(new ByteArrayInputStream(r.tree))){
   if(in.readLong()!=33486||in.readInt()!=r.players||in.readInt()!=1||in.readInt()!=r.street||in.readInt()!=r.pot*1000)throw new IOException("Tree header differs");
   for(int p=0;p<r.players;p++){
    int own=app(p,r.players),opponent=0;for(int j=0;j<r.players;j++)if(j!=own)opponent=Math.max(opponent,r.stacks[j]);
    if(in.readInt()!=Math.min(r.stacks[own],opponent)*1000)throw new IOException("Effective stack differs");
   }
  }
  return r;
 }
 static void archive(Request r,Path file)throws Exception {
  LinkedHashMap<String,Object> entries=new LinkedHashMap<>();
  entries.put("version",10114);entries.put("game",0);entries.put("isoLevel",0);entries.put("avgstreets",2);entries.put("evstreets",2);
  entries.put("board",new ArrayList<>(r.board));entries.put("avg",new double[0][]);entries.put("iterations",0L);entries.put("iscount",0L);entries.put("evs",new double[r.players]);entries.put("eviters",new long[r.players]);
  for(int p=0;p<r.players;p++)entries.put("rng"+p,r.ranges[p]);
  for(int p=0;p<r.players*4;p++)entries.put("cf"+p,new double[0][]);
  try(ZipOutputStream out=new ZipOutputStream(Files.newOutputStream(file),ZIP)){
   out.putNextEntry(new ZipEntry("tree"));out.write(r.tree);out.closeEntry();
   for(var entry:entries.entrySet()){out.putNextEntry(new ZipEntry(entry.getKey()));out.write(MonkerKernel.serialized(entry.getValue()));out.closeEntry();}
  }
 }
 static int chips(int nativeValue)throws IOException{if(nativeValue%1000!=0)throw new IOException("Fractional cent in native tree");return nativeValue/1000;}
 static void solve(Path input,Path output,String vendor)throws Exception {
  long started=System.nanoTime();Request r=read(input);Path source=Path.of(output+".input.mkr"),trained=Path.of(output+".trained.mkr");archive(r,source);
  long combinations=1;boolean pairs=true;
  for(double[] range:r.ranges){int count=0;for(double weight:range)if(weight>0)count++;combinations=Math.min(1000000000L,combinations*count);}
  double[] ones=new double[1326];Arrays.fill(ones,1);h[][] all=new aZ(ones).d();
  for(double[] range:r.ranges)for(int j=0;j<range.length;j++)if(range[j]>0&&all[j][0].toString().charAt(0)!=all[j][1].toString().charAt(0))pairs=false;
  boolean audit=r.prefix.length==0&&(combinations<=4096||pairs);
  MonkerKernel.writeArchive=audit;MonkerKernel.emitPayoffDiagnostics=false;
  PrintStream console=System.out;
  try {System.setOut(System.err);MonkerKernel.main(new String[]{source.toString(),vendor,trained.toString(),"2000","4","fresh"});}
  finally{System.setOut(console);MonkerKernel.writeArchive=true;MonkerKernel.emitPayoffDiagnostics=true;}
  List<MonkerPolicyExport.Node> nodes=MonkerPolicyExport.nodes;MonkerPolicyExport.Node decision=nodes.get(0);
  for(int code:r.prefix){MonkerPolicyExport.Node next=null;for(var child:decision.children)if(child.action==code)next=child;if(next==null)throw new IOException("Observed line missing");decision=next;}
  int p=(r.hero+1)%r.players;if(decision.state.i!=p||decision.children.isEmpty())throw new IOException("Wrong current actor");
  h[] hand=r.heroCards.stream().map(h::a).toArray(h[]::new),board=r.board.stream().map(h::a).toArray(h[]::new);
  long handKey=MonkerPolicyExport.handKey(hand,board);if(!v.j[p].b(handKey))throw new IOException("Hero absent from range");
  int bucket=v.j[p].a(handKey),actions=decision.children.size();double[] frequencies=new double[actions];double weight=0;
  for(int a=0;a<actions;a++){frequencies[a]=v.m[decision.id][bucket*actions+a];weight+=frequencies[a];}
  if(!Double.isFinite(weight)||weight<=0)throw new IOException("Hero strategy was not visited in this budget");for(int a=0;a<actions;a++)frequencies[a]/=weight;
  List<String> publicNodes=new ArrayList<>();
  for(var node:nodes){
   int[] amounts=new int[r.players];for(int j=0;j<r.players;j++)amounts[app(j,r.players)]=chips(node.state.e[j]);
   int[] active=Arrays.stream(node.state.k()).map(j->app(j,r.players)).sorted().toArray();
   List<Integer> codes=new ArrayList<>(),children=new ArrayList<>();for(var child:node.children){codes.add(child.action);children.add(child.id);}
   publicNodes.add("{\"id\":"+node.id+",\"actor\":"+app(node.state.i,r.players)+",\"street\":"+node.state.g+",\"contributions\":"+Arrays.toString(amounts)+",\"active\":"+Arrays.toString(active)+",\"actions\":"+codes+",\"children\":"+children+"}");
  }
  Field ef=v.class.getDeclaredField("E"),ff=v.class.getDeclaredField("F");ef.setAccessible(true);ff.setAccessible(true);
  h[][][] actual=(h[][][])ef.get(null);double[][] weights=(double[][])ff.get(null);
  int[] rangeCounts=new int[r.players];List<String> rangeJson=new ArrayList<>();
  for(int j=0;j<r.players;j++){int vp=(j+1)%r.players;List<String> values=new ArrayList<>();rangeCounts[j]=actual[vp].length;
   for(int k=0;k<actual[vp].length;k++)values.add("{\"cards\":"+MonkerPolicyExport.quote(actual[vp][k][0].toString()+actual[vp][k][1].toString())+",\"weight\":"+weights[vp][k]+"}");rangeJson.add("["+String.join(",",values)+"]");}
  String result="{\"vendorSha256\":"+MonkerPolicyExport.quote(MonkerPolicyExport.VENDOR_SHA)+",\"requestSha256\":"+MonkerPolicyExport.quote(MonkerPolicyExport.sha(Files.readAllBytes(input)))+",\"players\":"+r.players+",\"decision\":"+decision.id+",\"rangeCounts\":"+Arrays.toString(rangeCounts)+",\"ranges\":["+String.join(",",rangeJson)+"],\"frequencies\":"+Arrays.toString(frequencies)+",\"bucketWeight\":"+weight+",\"iterations\":"+v.t+",\"nodes\":["+String.join(",",publicNodes)+"],\"measuredErrorPct\":null,\"auditCandidate\":"+audit+",\"elapsedMs\":"+((System.nanoTime()-started)/1e6)+"}";
  Files.writeString(output,result);
  if(audit){
   MonkerPolicyExport.nodes.clear();MonkerPolicyExport.serialNodes=0;
   try(PrintStream stream=new PrintStream(Files.newOutputStream(Path.of(output+".model.json")),false,StandardCharsets.UTF_8)){System.setOut(stream);MonkerPolicyExport.main(new String[]{trained.toString(),vendor});}
   finally{System.setOut(console);}
  }
 }
 public static void main(String[] args)throws Exception {
  System.setProperty("java.awt.headless","true");
  if(args.length==4&&args[0].equals("--once")){solve(Path.of(args[1]),Path.of(args[2]),args[3]);return;}
  if(args.length!=1)throw new IOException("Expected pinned vendor path");
  System.out.println("{\"ready\":true}");
  try(BufferedReader reader=new BufferedReader(new InputStreamReader(System.in,StandardCharsets.UTF_8))){
   String line;while((line=reader.readLine())!=null){
    if(line.length()>16000)throw new IOException("Command size");String[] command=line.split("\t");
    if(command.length!=3||!command[0].matches("[a-f0-9-]{36}"))throw new IOException("Command identity");
    String id=command[0];try{solve(Path.of(new String(Base64.getDecoder().decode(command[1]),StandardCharsets.UTF_8)),Path.of(new String(Base64.getDecoder().decode(command[2]),StandardCharsets.UTF_8)),args[0]);System.out.println("{\"id\":"+MonkerPolicyExport.quote(id)+",\"ok\":true}");}
    catch(Throwable error){System.out.println("{\"id\":"+MonkerPolicyExport.quote(id)+",\"error\":"+MonkerPolicyExport.quote(error.toString())+"}");return;}
   }
  }
 }
}
