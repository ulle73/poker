package c;
import java.io.*;
import java.nio.charset.Charset;
import java.nio.file.*;
import java.util.*;
import java.util.zip.*;
public class MonkerRangeProbe {
 static String key(String cards){String[] p={cards.substring(0,2),cards.substring(2)};Arrays.sort(p);return String.join("",p);}
 public static void main(String[] args)throws Exception{
  double[] ones=new double[1326];Arrays.fill(ones,1);h[][] all=new aZ(ones).d();Map<String,Double> selected=new HashMap<>();
  if(args[2].equals("top50hero"))for(String line:Files.readAllLines(Path.of(args[3]))){String[] x=line.split("\\t");selected.put(key(x[0]),Double.parseDouble(x[1]));}
  try(ZipFile z=new ZipFile(args[0],Charset.forName("UTF-16"));ZipOutputStream out=new ZipOutputStream(Files.newOutputStream(Path.of(args[1])),Charset.forName("UTF-16"))){
   for(ZipEntry e:Collections.list(z.entries())){
    out.putNextEntry(new ZipEntry(e.getName()));
    if(e.getName().equals("tree")&&args.length>4){
     byte[] tree;try(InputStream in=z.getInputStream(e)){tree=in.readAllBytes();}
     java.nio.ByteBuffer header=java.nio.ByteBuffer.wrap(tree);int n=header.getInt(8),stack=Integer.parseInt(args[4]);if(stack<=0)throw new IllegalArgumentException("Invalid stack");
     for(int p=0;p<n;p++)header.putInt(24+p*4,stack);out.write(tree);
    }else if(e.getName().matches("rng[0-5]")){
     int player=Integer.parseInt(e.getName().substring(3));double[] weights=new double[1326];String[] ranks={"AQ","KJ","T9","86","54","32"};
     for(int j=0;j<all.length;j++){
      String cards=all[j][0].toString()+all[j][1].toString();
      if(args[2].equals("suitclosed"))weights[j]=cards.charAt(0)==cards.charAt(2)&&ranks[player].indexOf(cards.charAt(0))>=0?1:0;
      else if(args[2].equals("top50hero"))weights[j]=player==1?selected.getOrDefault(key(cards),0.0):1;
      else throw new IllegalArgumentException("Unsupported range model");
     }
     try(ObjectOutputStream o=new ObjectOutputStream(new FilterOutputStream(out){public void close()throws IOException{flush();}})){o.writeObject(weights);}
    }else try(InputStream in=z.getInputStream(e)){in.transferTo(out);}
    out.closeEntry();
   }
  }
 }
}
