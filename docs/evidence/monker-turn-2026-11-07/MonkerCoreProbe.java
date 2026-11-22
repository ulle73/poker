package c;
import a.a.a.a.b.a;
import d.a.a.b.c;
import java.io.*;
import java.lang.reflect.*;
import java.nio.charset.Charset;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.zip.*;
/** Diagnostic host of the unmodified vendor numeric kernel. Never instantiates
 * a window/controller, reads UI state, or changes vendor bytecode/algorithm. */
public class MonkerCoreProbe {
 static void field(String name,Object value)throws Exception{Field f=v.class.getDeclaredField(name);f.setAccessible(true);f.set(null,value);}
 static int end(MonkerPolicyExport.Node node){return node.children.isEmpty()?node.id:end(node.children.get(node.children.size()-1));}
 static byte[] serialized(Object value)throws Exception{ByteArrayOutputStream b=new ByteArrayOutputStream();try(ObjectOutputStream o=new ObjectOutputStream(b)){o.writeObject(value);}return b.toByteArray();}
 static void runPhase(List<aE> engines,long deadline)throws Exception{
  Field stop=aE.class.getDeclaredField("n");stop.setAccessible(true);
  for(aE engine:engines)stop.setBoolean(engine,false);
  List<Throwable> failures=Collections.synchronizedList(new ArrayList<>());List<Thread> threads=new ArrayList<>();
  ScheduledExecutorService timer=Executors.newSingleThreadScheduledExecutor();
  timer.schedule(()->{try{for(aE engine:engines)stop.setBoolean(engine,true);}catch(Throwable t){failures.add(t);}},Math.max(0,deadline-System.nanoTime()),TimeUnit.NANOSECONDS);
  try{
   for(aE engine:engines){Thread thread=new Thread(()->{try{while(System.nanoTime()<deadline)v.a(engine);}catch(Throwable t){failures.add(t);}},"monker-numeric");threads.add(thread);thread.start();}
   for(Thread thread:threads)thread.join();
  }finally{timer.shutdownNow();}
  if(!failures.isEmpty())throw new RuntimeException("Vendor numeric worker failed",failures.get(0));
 }
 public static void main(String[] args)throws Exception{
  System.setProperty("java.awt.headless","true");
  if(args.length<6||args.length>7)throw new IllegalArgumentException("archive vendorBinary outputArchive milliseconds threads fresh|resume");
  if(!MonkerPolicyExport.sha(Files.readAllBytes(Path.of(args[1]))).equals(MonkerPolicyExport.VENDOR_SHA))throw new IOException("Vendor hash mismatch");
  long start=System.nanoTime();Path input=Path.of(args[0]);int millis=Integer.parseInt(args[3]),threads=Integer.parseInt(args[4]);boolean fresh=args[5].equals("fresh");int warmup=args.length==7?Integer.parseInt(args[6]):0;
  if(warmup<0||warmup>=millis&&warmup!=0||millis<0||millis>120000||threads<1||threads>8||!Set.of("fresh","resume").contains(args[5]))throw new IllegalArgumentException("Invalid diagnostic budget");
  try(ZipFile z=new ZipFile(input.toFile(),Charset.forName("UTF-16"))){
   if(((Number)MonkerPolicyExport.read(z,"version")).intValue()!=10114||((Number)MonkerPolicyExport.read(z,"game")).intValue()!=0||((Number)MonkerPolicyExport.read(z,"isoLevel")).intValue()!=0||((Number)MonkerPolicyExport.read(z,"avgstreets")).intValue()!=2||((Number)MonkerPolicyExport.read(z,"evstreets")).intValue()!=2)throw new IOException("Unsupported model");
   byte[] tree;try(InputStream in=z.getInputStream(z.getEntry("tree"))){tree=in.readAllBytes();}
   List<String> boardText=(List<String>)MonkerPolicyExport.read(z,"board");h[] board=boardText.stream().map(h::a).toArray(h[]::new);
   int n,g,pot,actor;by root;int[] offsets;
   try(DataInputStream in=new DataInputStream(new ByteArrayInputStream(tree))){
    if(in.readLong()!=33486)throw new IOException("Tree magic");n=in.readInt();actor=in.readInt();g=in.readInt();pot=in.readInt();
    if(n<2||n>6||g!=board.length-2||g<2||g>3)throw new IOException("Free turn/river NLHE only");
    root=new by(new int[n],n,g,pot,actor);for(int p=0;p<n;p++)root.b[p]=in.readInt();
    offsets=new int[n*4];MonkerPolicyExport.runtime(MonkerPolicyExport.stored(in,-1,0),root,offsets);
    if(in.readBoolean()||in.available()!=0)throw new IOException("Only archive rng entries supported");
   }
   List<MonkerPolicyExport.Node> nodes=MonkerPolicyExport.nodes;
   v.x=root;v.d=board;v.B=4;v.A=2;v.z=2;v.k=false;v.i=null;v.a=null;v.g=false;v.f=null;v.e=0;
   v.j=new a[n];v.c=new byte[n][];v.s=new int[n*4];v.n=new boolean[n*4];v.q=new int[nodes.size()+1];
   h[][][] hands=new h[n][][];double[][] weights=new double[n][],dense=new double[n][];
   for(int p=0;p<n;p++){
    double[] rng=(double[])MonkerPolicyExport.read(z,"rng"+p);aZ range=new aZ(rng);range.a(board);hands[p]=range.d();weights[p]=range.f();dense[p]=range.a;
    v.j[p]=new a();int[] counts=v.a(hands[p],g,board,v.j[p]);
    for(int s=g;s<4;s++){v.s[p*4+s]=counts[s-1];v.n[p*4+s]=true;}
    v.c[p]=new byte[hands[p].length*2];for(int j=0;j<hands[p].length;j++){v.c[p][2*j]=(byte)hands[p][j][0].d();v.c[p][2*j+1]=(byte)hands[p][j][1].d();}
   }
   field("E",hands);field("F",weights);field("G",dense);
   v.m=fresh?new double[nodes.size()+1][]:(double[][])MonkerPolicyExport.read(z,"avg");v.l=new double[n*4][][];long informationStates=0;
   for(MonkerPolicyExport.Node node:nodes)if(!node.children.isEmpty()){int buckets=v.s[node.state.i*4+node.state.g];informationStates+=buckets;if(fresh)v.m[node.id]=new double[buckets*node.children.size()];}
   for(int group=0;group<n*4;group++){
    v.l[group]=fresh?new double[v.s[group]][offsets[group]]:(double[][])MonkerPolicyExport.read(z,"cf"+group);
    if(v.l[group].length!=v.s[group])throw new IOException("CF bucket shape");
    for(double[] row:v.l[group]){if(row.length!=offsets[group])throw new IOException("CF slot shape");if(fresh)Arrays.fill(row,0);}
   }
   if(fresh)for(double[] row:v.m)if(row!=null)Arrays.fill(row,0);
   v.t=fresh?0:((Number)MonkerPolicyExport.read(z,"iterations")).longValue();
   v.o=new double[n];v.p=new long[n];
   az.c(nodes.size()+1);az.a=new boolean[nodes.size()+1];List<by> leaves=new ArrayList<>();
   for(MonkerPolicyExport.Node node:nodes){
    if(node.children.isEmpty()){
     az.a((long)node.id,-1);az.b((long)node.id,leaves.size());az.c((long)node.id,node.id);
     if(node.state.g())az.d((long)node.id,node.state.m());
     leaves.add(node.state);
    }else{az.a((long)node.id,node.state.i*4+node.state.g);az.b((long)node.id,node.offset);az.c((long)node.id,end(node));v.q[node.id]=node.children.size();}
   }
   v.r=new aI(root,null,n);v.r.a(leaves.toArray(by[]::new));
   c.a();
   if(millis==0&&n==3){
    List<String> cases=new ArrayList<>();
    for(int variant=0;variant<2;variant++){
     h[][] selected=new h[n][];Set<String> used=new HashSet<>(boardText);List<String> labels=new ArrayList<>();
     for(int p=0;p<n;p++){selected[p]=hands[p][variant==0?0:hands[p].length-1];labels.add(selected[p][0].toString()+selected[p][1].toString());used.add(selected[p][0].toString());used.add(selected[p][1].toString());}
     for(String riverText:List.of("2s","2h","2d","2c","3s","3h","3d","3c","4s","4h","4d","4c","5s","5h","5d","5c","6s","6h","6d","6c","7s","7h","7d","7c","8s","8h","8d","8c","9s","9h","9d","9c","Ts","Th","Td","Tc","Js","Jh","Jd","Jc","Qs","Qh","Qd","Qc","Ks","Kh","Kd","Kc","As","Ah","Ad","Ac")){h river=h.a(riverText);
      if(g==2&&used.contains(river.toString()))continue;
      h[] publicBoard=Arrays.copyOf(board,5);if(g==2)publicBoard[4]=river;
      int[] inputCards=new int[7];for(int j=0;j<5;j++)inputCards[j+2]=publicBoard[j].d();
      int partial=c.b(inputCards);int[] ranks=new int[n],scratch=new int[n];
      for(int p=0;p<n;p++)ranks[p]=c.a(partial,selected[p][0].d(),selected[p][1].d());
      int rankId=v.r.a(ranks,scratch);List<String> payoffs=new ArrayList<>();
      for(int p=0;p<n;p++)payoffs.add(Arrays.toString(v.r.a(rankId,ranks,p)));
      List<String> publicText=new ArrayList<>();for(h card:publicBoard)publicText.add(MonkerPolicyExport.quote(card.toString()));
      cases.add("{\"board\":["+String.join(",",publicText)+"],\"hands\":["+String.join(",",labels.stream().map(MonkerPolicyExport::quote).toList())+"],\"payoffsByHero\":["+String.join(",",payoffs)+"]}");
      if(g==3)break;
     }
    }
    Files.writeString(Path.of(args[2]+".payoffs.json"),"["+String.join(",",cases)+"]");
   }
   long ready=System.nanoTime(),deadline=ready+millis*1000000L;long iterationsBefore=v.t;
   List<aE> engines=new ArrayList<>();for(int i=0;i<threads;i++)engines.add(new aF(new SplittableRandom(0x76a11L+i)));
   if(warmup>0){runPhase(engines,ready+warmup*1000000L);for(double[] row:v.m)if(row!=null)Arrays.fill(row,0);}
   if(millis>0)runPhase(engines,deadline);
   long finished=System.nanoTime();Map<String,byte[]> changes=new HashMap<>();changes.put("avg",serialized(v.m));changes.put("iscount",serialized(Long.valueOf(informationStates)));changes.put("iterations",serialized(Long.valueOf(v.t)));changes.put("evs",serialized(v.o));changes.put("eviters",serialized(v.p));
   for(int group=0;group<n*4;group++)changes.put("cf"+group,serialized(v.l[group]));
   try(ZipOutputStream out=new ZipOutputStream(Files.newOutputStream(Path.of(args[2])),Charset.forName("UTF-16"))){
    for(ZipEntry entry:Collections.list(z.entries())){
     out.putNextEntry(new ZipEntry(entry.getName()));if(changes.containsKey(entry.getName()))out.write(changes.get(entry.getName()));else try(InputStream in=z.getInputStream(entry)){in.transferTo(out);}out.closeEntry();
    }
   }
   String runResult="{\"players\":"+n+",\"threads\":"+threads+",\"averageResetAfterMs\":"+warmup+",\"fresh\":"+fresh+",\"iterationsBefore\":"+iterationsBefore+",\"iterations\":"+v.t+",\"initializeMs\":"+((ready-start)/1e6)+",\"computeMs\":"+((finished-ready)/1e6)+",\"totalMs\":"+((System.nanoTime()-start)/1e6)+",\"qualityVerified\":false}";
   Files.writeString(Path.of(args[2]+".run.json"),runResult);System.out.println(runResult);
   az.b();
  }
 }
}
