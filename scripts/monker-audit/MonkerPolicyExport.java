package c;
import a.a.a.a.b.a;
import java.io.*;
import java.nio.charset.Charset;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.zip.*;

/** Version-pinned read-only interop. Calls only vendor's pure card/state transforms.
 * No controller, Swing window, solve thread, account or license changes.
 * The output is data for independent auditing, never a quality certificate.
 */
public class MonkerPolicyExport {
  static final String VENDOR_SHA="f66d7f2b5d8b35393577a39abfc0325215f26dd5102355e1ae49be477318e652";
  static int serialNodes;
  static class Stored {int action; List<Stored> children=new ArrayList<>();}
  static class Node {int id,action,offset;by state;List<Node> children=new ArrayList<>();}
  static final List<Node> nodes=new ArrayList<>();
  static String quote(String s){return "\""+s.replace("\\","\\\\").replace("\"","\\\"").replace("\n","\\n").replace("\r","\\r")+"\"";}
  static String sha(byte[] b)throws Exception{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(b));}
  static Object read(ZipFile z,String key)throws Exception{
    ZipEntry entry=z.getEntry(key);if(entry==null||entry.getSize()>100000000)throw new IOException("Missing/oversized entry: "+key);
    try(ObjectInputStream in=new ObjectInputStream(z.getInputStream(entry))){
      in.setObjectInputFilter(info->{
        if(info.depth()>16||info.references()>2000000||info.streamBytes()>100000000||info.arrayLength()>10000000)return ObjectInputFilter.Status.REJECTED;
        Class<?> t=info.serialClass();if(t==null)return ObjectInputFilter.Status.UNDECIDED;
        while(t.isArray())t=t.getComponentType();
        return t.isPrimitive()||Set.of("java.lang.Object","java.lang.String","java.lang.Number","java.lang.Integer","java.lang.Long","java.util.ArrayList").contains(t.getName())?ObjectInputFilter.Status.ALLOWED:ObjectInputFilter.Status.REJECTED;
      });
      return in.readObject();
    }
  }
  static Stored stored(DataInputStream in,int action,int depth)throws Exception{
    if(depth>64||++serialNodes>100000)throw new IOException("Tree budget exceeded");
    Stored node=new Stored();node.action=action;int count=in.readUnsignedShort();if(count>16)throw new IOException("Unsupported action count");
    Set<Integer> unique=new HashSet<>();
    for(int i=0;i<count;i++){int next=in.readUnsignedShort();if(!unique.add(next))throw new IOException("Duplicate action");node.children.add(stored(in,next,depth+1));}
    return node;
  }
  static Node runtime(Stored raw,by state,int[] offsets)throws Exception{
    Node node=new Node();node.id=nodes.size()+1;node.state=state;node.action=raw.action;nodes.add(node);
    node.offset=-1;
    if(!raw.children.isEmpty()){
      if(state.g>=4)throw new IOException("Actions at terminal");
      int group=state.i*4+state.g;node.offset=offsets[group];offsets[group]+=raw.children.size()+2;
    }else if(state.g<4)throw new IOException("Incomplete decision tree");
    // FREE10114 loader prepends codes. The runtime traversal is reverse stored order.
    for(int i=raw.children.size()-1;i>=0;i--){Stored child=raw.children.get(i);if(!state.d(child.action))throw new IOException("Illegal vendor transition");node.children.add(runtime(child,new by(state,child.action),offsets));}
    return node;
  }
  static String doubles(double[] values)throws Exception{
    if(values==null)return "null";
    for(double x:values)if(!Double.isFinite(x))throw new IOException("Non-finite average");
    return Arrays.toString(values);
  }
  static long handKey(h[] hand,h[] board){h[] cards=Arrays.copyOf(hand,board.length+2);System.arraycopy(board,0,cards,2,board.length);return ar.a(cards,h.c(7),new int[4]);}
  @SuppressWarnings("unchecked")
  public static void main(String[] args)throws Exception{
    System.setProperty("java.awt.headless","true");
    if(args.length!=2||!sha(Files.readAllBytes(Path.of(args[1]))).equals(VENDOR_SHA))throw new IOException("Expected archive and pinned official FREE10114 binary");
    long started=System.nanoTime();Path file=Path.of(args[0]);
    try(ZipFile z=new ZipFile(file.toFile(),Charset.forName("UTF-16"))){
      if(((Number)read(z,"version")).longValue()!=10114||((Number)read(z,"game")).longValue()!=0||((Number)read(z,"isoLevel")).longValue()!=0||((Number)read(z,"avgstreets")).longValue()!=2||((Number)read(z,"evstreets")).longValue()!=2)throw new IOException("Unsupported version/game/abstraction/output settings");
      List<String> boardText=(List<String>)read(z,"board");
      h[] board=boardText.stream().map(h::a).toArray(h[]::new);
      if(board.length<4||board.length>5||new HashSet<>(boardText).size()!=board.length)throw new IOException("Invalid board");
      double[][] avg=(double[][])read(z,"avg");
      byte[] tree;try(InputStream input=z.getInputStream(z.getEntry("tree"))){tree=input.readAllBytes();}
      by root;int players,street,deadPot;int[] offsets;
      try(DataInputStream in=new DataInputStream(new ByteArrayInputStream(tree))){
        if(in.readLong()!=33486)throw new IOException("Unsupported tree magic");
        players=in.readInt();int actor=in.readInt();street=in.readInt();deadPot=in.readInt();
        if(players<2||players>6||actor<0||actor>=players||street!=board.length-2||deadPot<=0)throw new IOException("Unsupported tree header");
        root=new by(new int[players],players,street,deadPot,actor);
        for(int p=0;p<players;p++){root.b[p]=in.readInt();if(root.b[p]<=0)throw new IOException("Invalid stack");}
        offsets=new int[players*4];Stored raw=stored(in,-1,0);runtime(raw,root,offsets);
        if(in.readBoolean())throw new IOException("Embedded tree ranges are not supported; archive rng entries are authoritative");
        if(in.available()!=0)throw new IOException("Trailing tree data");
      }
      if(avg.length!=nodes.size()+1)throw new IOException("Public-node identity mismatch");
      List<h[][]> holdings=new ArrayList<>();List<a> lookups=new ArrayList<>();List<int[]> bucketCounts=new ArrayList<>();
      List<String> rangeJson=new ArrayList<>();v.B=2;
      for(int p=0;p<players;p++){
        double[] weights=(double[])read(z,"rng"+p);
        if(weights.length!=1326)throw new IOException("Invalid NLHE range length");
        for(double x:weights)if(!Double.isFinite(x)||x<0||x>1)throw new IOException("Invalid range weight");
        aZ range=new aZ(weights);range.a(board);h[][] hands=range.d();double[] positive=range.f();
        if(hands.length==0||hands.length!=positive.length)throw new IOException("Empty/inconsistent range");
        a lookup=new a();int[] counts=v.a(hands,street,board,lookup);
        holdings.add(hands);lookups.add(lookup);bucketCounts.add(counts);
        List<String> values=new ArrayList<>();
        for(int j=0;j<hands.length;j++)values.add("{\"cards\":"+quote(hands[j][0].toString()+hands[j][1].toString())+",\"weight\":"+positive[j]+"}");
        rangeJson.add("["+String.join(",",values)+"]");
      }
      for(Node node:nodes)if(!node.children.isEmpty()){
        int count=bucketCounts.get(node.state.i)[node.state.g-1];
        if(avg[node.id]==null||avg[node.id].length!=count*node.children.size())throw new IOException("Policy layout mismatch at node "+node.id);
        for(double x:avg[node.id])if(!Double.isFinite(x)||x<0)throw new IOException("Invalid average weight");
      }
      List<h[]> boards=new ArrayList<>();boards.add(board);
      if(board.length==4)for(String card:List.of("2s","2h","2d","2c","3s","3h","3d","3c","4s","4h","4d","4c","5s","5h","5d","5c","6s","6h","6d","6c","7s","7h","7d","7c","8s","8h","8d","8c","9s","9h","9d","9c","Ts","Th","Td","Tc","Js","Jh","Jd","Jc","Qs","Qh","Qd","Qc","Ks","Kh","Kd","Kc","As","Ah","Ad","Ac"))if(!boardText.contains(card)){h[] next=Arrays.copyOf(board,5);next[4]=h.a(card);boards.add(next);}
      List<String> boardMaps=new ArrayList<>();
      for(h[] publicBoard:boards){
        List<String> seatMaps=new ArrayList<>();String boardKey="";for(h card:publicBoard)boardKey+=card.toString();
        for(int p=0;p<players;p++){
          List<String> entries=new ArrayList<>();
          for(h[] hand:holdings.get(p)){
            boolean blocked=false;for(h card:publicBoard)for(h hole:hand)if(card.a(hole))blocked=true;
            if(blocked)continue;long key=handKey(hand,publicBoard);a lookup=lookups.get(p);
            if(!lookup.b(key))throw new IOException("Unmapped holding/runout");
            entries.add(quote(hand[0].toString()+hand[1].toString())+":"+lookup.a(key));
          }
          seatMaps.add("{"+String.join(",",entries)+"}");
        }
        boardMaps.add(quote(boardKey)+":["+String.join(",",seatMaps)+"]");
      }
      List<String> nodeJson=new ArrayList<>();
      for(Node node:nodes){
        List<Integer> actions=new ArrayList<>(),children=new ArrayList<>();for(Node child:node.children){actions.add(child.action);children.add(child.id);}
        nodeJson.add("{\"id\":"+node.id+",\"actor\":"+node.state.i+",\"street\":"+node.state.g+",\"contributions\":"+Arrays.toString(node.state.e)+",\"active\":"+Arrays.toString(node.state.k())+",\"actions\":"+actions+",\"children\":"+children+",\"cfGroup\":"+(node.state.i*4+node.state.g)+",\"cfOffset\":"+node.offset+"}");
      }
      List<String> averageJson=new ArrayList<>();for(double[] row:avg)averageJson.add(doubles(row));
      Map<Integer,double[][]> cf=new HashMap<>();
      List<String> currentJson=new ArrayList<>();currentJson.add("null");
      for(Node node:nodes){
        int count=node.children.size();
        if(count==0){currentJson.add("null");continue;}
        int group=node.state.i*4+node.state.g;
        if(!cf.containsKey(group)){
          double[][] rows=(double[][])read(z,"cf"+group);
          if(rows.length!=bucketCounts.get(node.state.i)[node.state.g-1])throw new IOException("Regret bucket count mismatch");
          for(double[] row:rows)if(row==null||row.length!=offsets[group])throw new IOException("Regret slot layout mismatch");
          cf.put(group,rows);
        }
        double[][] rows=cf.get(group);double[] regrets=new double[rows.length*count];
        for(int bucket=0;bucket<rows.length;bucket++)for(int j=0;j<count;j++)regrets[bucket*count+j]=rows[bucket][node.offset+j];
        currentJson.add(doubles(regrets));
      }
      // Vendor EV slots: (action sum + shared baseline sum) / sample weight.
      // They summarize sampled training play, not exact EV under the final policy.
      Node rootNode=nodes.get(0);int actionCount=rootNode.children.size();
      double[][] evBlock=(double[][])read(z,"cf"+(root.i*4+root.g));
      List<String> sampledEvs=new ArrayList<>();
      if(actionCount>0)for(h[] hand:holdings.get(root.i)){
        int bucket=lookups.get(root.i).a(handKey(hand,board));double[] values=evBlock[bucket];
        if(values.length!=offsets[root.i*4+root.g])throw new IOException("EV slot layout mismatch");
        double weight=values[rootNode.offset+actionCount],baseline=values[rootNode.offset+actionCount+1];
        List<String> evs=new ArrayList<>();
        for(int j=0;j<actionCount;j++){double estimate=(values[rootNode.offset+j]+baseline)/weight;evs.add(weight>1e-11&&Double.isFinite(estimate)?Double.toString(estimate):"null");}
        sampledEvs.add(quote(hand[0].toString()+hand[1].toString())+":["+String.join(",",evs)+"]");
      }
      System.out.println("{\"schema\":\"monker-audit-10114-v1\",\"version\":10114,\"vendorSha256\":"+quote(VENDOR_SHA)+",\"archiveSha256\":"+quote(sha(Files.readAllBytes(file)))+",\"treeSha256\":"+quote(sha(tree))+",\"iterations\":"+read(z,"iterations")+",\"informationStates\":"+read(z,"iscount")+",\"players\":"+players+",\"deadPot\":"+deadPot+",\"board\":"+boardText.stream().map(MonkerPolicyExport::quote).toList()+",\"ranges\":["+String.join(",",rangeJson)+"],\"nodes\":["+String.join(",",nodeJson)+"],\"averages\":["+String.join(",",averageJson)+"],\"currentRegrets\":["+String.join(",",currentJson)+"],\"bucketMaps\":{"+String.join(",",boardMaps)+"},\"sampledRootEvs\":{"+String.join(",",sampledEvs)+"},\"decodeMs\":"+((System.nanoTime()-started)/1000000.0)+",\"qualityVerified\":false}");
    }
  }
}

