import java.io.*;
import java.nio.charset.*;
import java.nio.file.*;
import java.util.*;
import java.util.zip.*;

/** Read-only inspection of primitive serialized data in locally produced Monker files. */
public class MonkerArchiveInspect {
  static String quote(String s){return "\""+s.replace("\\","\\\\").replace("\"","\\\"")+"\"";}
  static Object read(byte[] b)throws Exception{
    try(ObjectInputStream in=new ObjectInputStream(new ByteArrayInputStream(b))){
      in.setObjectInputFilter(info->{
        if(info.depth()>16||info.references()>2000000||info.streamBytes()>100000000||info.arrayLength()>10000000)return ObjectInputFilter.Status.REJECTED;
        Class<?> c=info.serialClass();if(c==null)return ObjectInputFilter.Status.UNDECIDED;
        while(c.isArray())c=c.getComponentType();
        return c.isPrimitive()||Set.of("java.lang.Object","java.lang.String","java.lang.Number","java.lang.Integer","java.lang.Long","java.util.ArrayList","java.util.HashMap").contains(c.getName())?ObjectInputFilter.Status.ALLOWED:ObjectInputFilter.Status.REJECTED;
      }); return in.readObject();
    }
  }
  static String describe(Object x){
    if(x==null)return "null";
    if(x instanceof Number||x instanceof Boolean)return x.toString();
    if(x instanceof String)return quote((String)x);
    if(x instanceof List){List<String> a=new ArrayList<>();for(Object v:(List<?>)x)a.add(describe(v));return "["+String.join(",",a)+"]";}
    if(x.getClass().isArray()){
      int len=java.lang.reflect.Array.getLength(x);long count=0,nonzero=0,nonfinite=0;double min=Double.POSITIVE_INFINITY,max=Double.NEGATIVE_INFINITY;List<String> shape=new ArrayList<>();
      ArrayDeque<Object> q=new ArrayDeque<>();q.add(x);
      while(!q.isEmpty()){Object a=q.remove();int n=java.lang.reflect.Array.getLength(a);for(int i=0;i<n;i++){Object v=java.lang.reflect.Array.get(a,i);if(v==null)continue;if(v.getClass().isArray()){if(shape.size()<20)shape.add(""+java.lang.reflect.Array.getLength(v));q.add(v);}else if(v instanceof Number){double d=((Number)v).doubleValue();count++;if(d!=0)nonzero++;if(!Double.isFinite(d))nonfinite++;else{min=Math.min(min,d);max=Math.max(max,d);}}}}
      return "{\"type\":"+quote(x.getClass().getName())+",\"length\":"+len+",\"firstInnerLengths\":["+String.join(",",shape)+"],\"numericCount\":"+count+",\"nonzero\":"+nonzero+",\"nonfinite\":"+nonfinite+(count>0?",\"min\":"+min+",\"max\":"+max:"")+"}";
    }
    return quote(x.toString());
  }
  public static void main(String[] args)throws Exception{
    List<String> results=new ArrayList<>();
    for(String arg:args){List<String> entries=new ArrayList<>();
      try(ZipFile zip=new ZipFile(arg,Charset.forName("UTF-16"))){
        for(ZipEntry e:Collections.list(zip.entries())){byte[] bytes;try(InputStream in=zip.getInputStream(e)){bytes=in.readAllBytes();}
          String value;
          if(e.getName().equals("tree")){try(DataInputStream in=new DataInputStream(new ByteArrayInputStream(bytes))){long magic=in.readLong();int n=in.readInt(),actor=in.readInt(),street=in.readInt(),pot=in.readInt();List<String> stacks=new ArrayList<>();for(int i=0;i<n;i++)stacks.add(""+in.readInt());value="{\"magic\":"+magic+",\"players\":"+n+",\"actor\":"+actor+",\"street\":"+street+",\"potInternal\":"+pot+",\"stacksInternal\":["+String.join(",",stacks)+"]}";}}
          else {try{value=describe(read(bytes));}catch(Exception err){value="{\"readError\":"+quote(err.toString())+"}";}}
          if(e.getName().equals("tree"))entries.add("\"treeSha256\":"+quote(HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(bytes))));
          entries.add(quote(e.getName())+":"+value);
        }
      }
      results.add("{\"file\":"+quote(Path.of(arg).getFileName().toString())+",\"entries\":{"+String.join(",",entries)+"}}");
    }
    System.out.println("["+String.join(",",results)+"]");
  }
}
