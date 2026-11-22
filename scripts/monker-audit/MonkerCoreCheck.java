package c;
import java.nio.file.*;

/** Integration regression for repeated numeric jobs in one JVM. No GUI. */
public class MonkerCoreCheck {
  public static void main(String[] args)throws Exception {
    Path directory=Path.of(args[3]);Files.createDirectories(directory);
    for(int i=0;i<3;i++) {
      String input=i==1?args[1]:args[0];
      MonkerCoreProbe.main(new String[]{input,args[2],directory.resolve("repeated"+i+".mkr").toString(),"0","1","fresh"});
      int players=v.x.a;
      if(v.m.length!=MonkerPolicyExport.nodes.size()+1)throw new AssertionError("Stale public nodes");
      if(v.l.length!=players*4||v.t!=0)throw new AssertionError("Stale numeric state");
    }
    System.out.println("{\"repeatedJobs\":3,\"passed\":true}");
  }
}
