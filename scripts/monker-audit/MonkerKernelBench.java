package c;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;

/** Sequential timing probe: one warm-up, fresh strategies for every measured
 * job. Decode in the same JVM, then audit independently in Node. No UI calls. */
public class MonkerKernelBench {
  public static void main(String[] args)throws Exception {
    Path inputs=Path.of(args[0]),output=Path.of(args[2]);Files.createDirectories(output);
    String vendor=args[1];
    MonkerCoreProbe.main(new String[]{inputs.resolve("spr2-pairs6-input.mkr").toString(),vendor,output.resolve("warm.mkr").toString(),"3000","8","fresh"});
    boolean threadSweep=args.length==4&&args[3].equals("thread-sweep");
    int[] counts=threadSweep?new int[]{6,6,6,6}:new int[]{3,4,5,6,6,6};
    int[] threadCounts=threadSweep?new int[]{1,2,4,8}:new int[]{8,8,8,8,8,8};
    for(int i=0;i<counts.length;i++){
      String name="job"+i+"-"+counts[i]+"p";Path archive=output.resolve(name+".mkr");
      long start=System.nanoTime();
      MonkerCoreProbe.main(new String[]{inputs.resolve("spr2-pairs"+counts[i]+"-input.mkr").toString(),vendor,archive.toString(),"2000",Integer.toString(threadCounts[i]),"fresh"});
      MonkerPolicyExport.nodes.clear();MonkerPolicyExport.serialNodes=0;
      PrintStream console=System.out;
      try(PrintStream stream=new PrintStream(Files.newOutputStream(output.resolve(name+".json")),false,StandardCharsets.UTF_8)){
        System.setOut(stream);MonkerPolicyExport.main(new String[]{archive.toString(),vendor});
      }finally{System.setOut(console);}
      Files.writeString(output.resolve(name+"-timing.json"),"{\"players\":"+counts[i]+",\"threads\":"+threadCounts[i]+",\"fresh\":true,\"sameJvm\":true,\"solveAndDecodeMs\":"+((System.nanoTime()-start)/1e6)+"}");
    }
  }
}
