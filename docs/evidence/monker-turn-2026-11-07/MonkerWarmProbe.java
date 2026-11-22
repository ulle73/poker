package c;
public class MonkerWarmProbe {
 public static void main(String[] args)throws Exception{
  MonkerCoreProbe.main(new String[]{args[0],args[1],args[2]+"-warm.mkr","2000","8","fresh","0"});
  MonkerPolicyExport.nodes.clear();MonkerPolicyExport.serialNodes=0;
  MonkerCoreProbe.main(new String[]{args[0],args[1],args[2]+"-measured.mkr","4000","8","fresh","1000"});
 }
}
