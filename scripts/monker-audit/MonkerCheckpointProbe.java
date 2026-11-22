package c;
import java.io.*;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.zip.*;

/** A single fresh solve, paused once per second. Sampling streams, regrets and
 * accumulated averages continue across checkpoints; there is no average reset.
 * The independent auditor, not this probe, decides whether a checkpoint passes. */
public class MonkerCheckpointProbe {
  static void save(Path source,Path output)throws Exception {
    Map<String,byte[]> changes=new HashMap<>();
    changes.put("avg",MonkerCoreProbe.serialized(v.m));
    changes.put("iterations",MonkerCoreProbe.serialized(Long.valueOf(v.t)));
    changes.put("evs",MonkerCoreProbe.serialized(v.o));
    changes.put("eviters",MonkerCoreProbe.serialized(v.p));
    for(int i=0;i<v.l.length;i++)changes.put("cf"+i,MonkerCoreProbe.serialized(v.l[i]));
    try(ZipFile z=new ZipFile(source.toFile(),Charset.forName("UTF-16"));
        ZipOutputStream out=new ZipOutputStream(Files.newOutputStream(output),Charset.forName("UTF-16"))){
      for(ZipEntry entry:Collections.list(z.entries())){
        out.putNextEntry(new ZipEntry(entry.getName()));
        if(changes.containsKey(entry.getName()))out.write(changes.get(entry.getName()));
        else try(InputStream in=z.getInputStream(entry)){in.transferTo(out);}
        out.closeEntry();
      }
    }
  }
  public static void main(String[] args)throws Exception {
    Path input=Path.of(args[0]),output=Path.of(args[2]);Files.createDirectories(output);
    String vendor=args[1];
    int threads=args.length>3?Integer.parseInt(args[3]):8;
    if(threads<1||threads>8)throw new IllegalArgumentException("Invalid thread count");
    MonkerCoreProbe.main(new String[]{input.toString(),vendor,output.resolve("warm.mkr").toString(),"2000","8","fresh"});
    Path initial=output.resolve("initial.mkr");
    MonkerCoreProbe.releaseNumericState=false;
    try {
      MonkerCoreProbe.main(new String[]{input.toString(),vendor,initial.toString(),"0",Integer.toString(threads),"fresh"});
      List<aE> engines=new ArrayList<>();for(int i=0;i<threads;i++)engines.add(new aF(new SplittableRandom(0x76a11L+i)));
      long started=System.nanoTime();double computeMs=0;
      for(int second=1;second<=6;second++){
        long phase=System.nanoTime();MonkerCoreProbe.runPhase(engines,phase+1000000000L);computeMs+=(System.nanoTime()-phase)/1e6;
        String name="checkpoint"+second;Path archive=output.resolve(name+".mkr");save(initial,archive);
        MonkerPolicyExport.nodes.clear();MonkerPolicyExport.serialNodes=0;
        PrintStream console=System.out;
        try(PrintStream stream=new PrintStream(Files.newOutputStream(output.resolve(name+".json")),false,StandardCharsets.UTF_8)){
          System.setOut(stream);MonkerPolicyExport.main(new String[]{archive.toString(),vendor});
        }finally{System.setOut(console);}
        String timing="{\"checkpoint\":"+second+",\"threads\":"+threads+",\"iterations\":"+v.t+",\"cumulativeComputeMs\":"+computeMs+",\"solveAndDecodeMs\":"+((System.nanoTime()-started)/1e6)+",\"strategyReset\":false}";
        Files.writeString(output.resolve(name+"-timing.json"),timing);System.out.println(timing);
      }
    } finally {MonkerCoreProbe.releaseNumericState=true;az.b();}
  }
}
