package c;
import java.io.*;
import java.nio.file.*;
import java.util.*;
/** Pure input fixture generation. Does not train, start a solver or access UI. */
public class MonkerNarrowInputs {
  static String key(h[] cards){String[] s={cards[0].toString(),cards[1].toString()};Arrays.sort(s);return String.join("",s);}
  public static void main(String[] args)throws Exception{
    System.setProperty("java.awt.headless","true");
    String[][] chosen={{"AhAd","QhQd"},{"KcKd","JhJd"},{"TcTd","9c9d"},{"8c8d","6c6d"},{"5c5d","4c4d"},{"3c3d","2h2d"}};
    double[] ones=new double[1326];Arrays.fill(ones,1);h[][] all=new aZ(ones).d();
    Path source=Path.of(args[0]),target=Path.of(args[1]);Files.createDirectories(target);
    for(int n=3;n<=6;n++)for(String street:new String[]{"turn","river"}){
      byte[] raw=Files.readAllBytes(source.resolve("monker-"+n+"p-"+street+"-control.tree"));
      if(raw[raw.length-1]!=0)throw new IOException("Expected default-range control tree");
      String name="monker-"+n+"p-"+street+"-audit2.tree";
      try(DataOutputStream out=new DataOutputStream(Files.newOutputStream(target.resolve(name)))){
        out.write(raw,0,raw.length-1);out.writeBoolean(true);
        for(int p=0;p<n;p++){
          Set<String> selected=new HashSet<>();for(String hand:chosen[p])selected.add(key(h.b(hand)));
          int count=0;for(h[] hand:all){boolean present=selected.contains(key(hand));if(present)count++;out.writeInt(present?Integer.MAX_VALUE:0);}
          if(count!=2)throw new IOException("Expected exactly two combos for seat "+p);
        }
      }
      System.out.println(name+"\t"+Files.size(target.resolve(name))+" bytes");
    }
  }
}
