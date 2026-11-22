package c;
import java.io.*;
import java.nio.file.*;
import java.util.*;

/** Audit-only input generation for the pinned Free 10114 binary.
 * Uses vendor's pure poker-state transitions, never its windows/controllers.
 * The produced 3p turn file MUST equal the actual GUI export byte for byte.
 * Not a solver, a quality certificate, or a production integration.
 */
public class MonkerProbeInputs {
  static int nodes;
  static void writeNode(DataOutputStream out,by state,int action,int depth)throws Exception {
    if(depth>40)throw new IOException("Unexpected model depth");
    if(action>=0)out.writeChar(action);
    List<Integer> actions=new ArrayList<>();
    for(int candidate:new int[]{3,0,1})if(state.d(candidate))actions.add(candidate);
    out.writeChar(actions.size());nodes++;
    for(int next:actions)writeNode(out,new by(state,next),next,depth+1);
  }
  public static void main(String[] args)throws Exception {
    System.setProperty("java.awt.headless","true");
    Path target=Path.of(args[0]);Files.createDirectories(target);
    for(int n=3;n<=6;n++)for(int street=2;street<=3;street++){
      by state=new by(new int[n],n,street,4000,1);
      Arrays.fill(state.b,200000);
      String name="monker-"+n+"p-"+(street==2?"turn":"river")+"-control.tree";
      nodes=0;
      try(DataOutputStream out=new DataOutputStream(Files.newOutputStream(target.resolve(name)))){
        out.writeLong(33486);out.writeInt(n);out.writeInt(state.i);out.writeInt(street);
        out.writeInt(4000);for(int stack:state.b)out.writeInt(stack);
        writeNode(out,state,-1,0);out.writeBoolean(false);
      }
      System.out.println(name+"\t"+nodes+" nodes\t"+Files.size(target.resolve(name))+" bytes");
    }
  }
}
