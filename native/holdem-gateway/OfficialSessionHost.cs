using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Pipes;
using System.Linq;
using System.Net.Http;
using System.Security.AccessControl;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;

// Windows SDK interop with the user's existing, explicitly authorized vendor
// profile. Cookies remain here in memory. The original gateway obtains grants;
// neither license keys nor grants are created, copied, replayed or exported.
class OfficialSessionHost {
 const string VendorSha="3a19379ed2743edb1234fa8af7b4b2eade7140ecad0159acc4dd6fc2f089ec7e";
 const string Origin="http://127.0.0.1:8900";
 const string PipeName="PokerAdvisor.HoldemSolver.093";
 static readonly JavaScriptSerializer Json=new JavaScriptSerializer {MaxJsonLength=16000000};
 static readonly HashSet<string> Owned=new HashSet<string>();
 static string Cookie;
 static void Emit(object value){Console.WriteLine(Json.Serialize(value));}
 static string Sha(string file){using(var f=File.OpenRead(file))using(var sha=SHA256.Create())return BitConverter.ToString(sha.ComputeHash(f)).Replace("-","").ToLowerInvariant();}
 [STAThread] static void Main(string[] args){
  if(args.Length!=1||!Path.IsPathRooted(args[0])||!File.Exists(args[0])||Sha(args[0])!=VendorSha){Emit(new {ready=false,error="VENDOR_IDENTITY"});return;}
  var form=new Form {ShowInTaskbar=false,Opacity=0,Width=1,Height=1,StartPosition=FormStartPosition.Manual,Location=new Point(-32000,-32000)};
  form.Shown+=async(s,e)=>{
   CoreWebView2Controller controller=null;
   try {
    if(Process.GetProcessesByName("nlhe-solver-desktop").Any(p=>!p.HasExited))throw new InvalidOperationException("PROFILE_BUSY");
    string profile=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"ai.dom888.nlhesolver");
    if(!Directory.Exists(Path.Combine(profile,"EBWebView","Default")))throw new InvalidOperationException("LOGIN_REQUIRED");
    // Ordinary SDK defaults. Do not alter the source's security settings.
    var env=await CoreWebView2Environment.CreateAsync(null,profile,null);
    controller=await env.CreateCoreWebView2ControllerAsync(form.Handle);controller.IsVisible=false;
    var cookies=await controller.CoreWebView2.CookieManager.GetCookiesAsync(Origin+"/");
    Cookie=String.Join("; ",cookies.Where(c=>c.Domain=="127.0.0.1").Select(c=>c.Name+"="+c.Value));
    controller.Close();controller=null;
    if(Cookie.Length==0)throw new InvalidOperationException("LOGIN_REQUIRED");
    // Supported source configuration, scoped to the launched vendor process.
    // Its memory monitor, adaptive growth headroom and process cap remain active.
    var start=new ProcessStartInfo {FileName=args[0],WorkingDirectory=Path.GetDirectoryName(args[0]),UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden};
    start.EnvironmentVariables["NLHE_RUNTIME_MEMORY_RESERVE_MB"]="384";
    Process.Start(start);
    using(var handler=new HttpClientHandler {UseCookies=false,UseProxy=false,AllowAutoRedirect=false})
    using(var http=new HttpClient(handler)){
     http.Timeout=TimeSpan.FromSeconds(15);
     bool authenticated=false;
     for(int i=0;i<60&&!authenticated;i++){
      try {var result=await Call(http,"GET","/app/session",null);var data=result.Data as Dictionary<string,object>;object value;authenticated=result.Status==200&&data!=null&&data.TryGetValue("authenticated",out value)&&value is bool&&(bool)value;}catch(HttpRequestException){}
      if(!authenticated)await Task.Delay(500);
     }
     if(!authenticated)throw new InvalidOperationException("LOGIN_REQUIRED");
     Emit(new {ready=true,authenticated=true,credentialsExposed=false});
     await Serve(http);
    }
   }catch(Exception ex){Emit(new {ready=false,error=ex is InvalidOperationException?ex.Message:"SESSION_HOST_FAILED",hresult=ex.HResult,credentialsExposed=false});}
   finally {Cookie=null;if(controller!=null)controller.Close();form.Close();}
  };
  Application.Run(form);
 }
 class Reply {public int Status;public object Data;}
 static async Task<Reply> Call(HttpClient http,string method,string path,object body){
  using(var request=new HttpRequestMessage(new HttpMethod(method),Origin+path)){
   request.Headers.TryAddWithoutValidation("Cookie",Cookie);
   request.Headers.TryAddWithoutValidation("Accept","application/json");
   if(body!=null)request.Content=new StringContent(Json.Serialize(body),Encoding.UTF8,"application/json");
   using(var response=await http.SendAsync(request)){
    string content=await response.Content.ReadAsStringAsync();if(content.Length>15000000)throw new InvalidOperationException("SOURCE_RESPONSE_TOO_LARGE");
    return new Reply {Status=(int)response.StatusCode,Data=Json.DeserializeObject(content)};
   }
  }
 }
 static bool Allowed(string method,string path){
  if(method=="GET"&&path=="/app/session")return true;
  if(method=="POST"&&path=="/api/runner/solve")return true;
  var m=Regex.Match(path,"^/api/runner/solve/([a-zA-Z0-9_-]{1,100})(?:/(strategy-snapshot|strategy-watch|stop))?$");
  if(!m.Success||!Owned.Contains(m.Groups[1].Value))return false;
  return method=="GET"&&(!m.Groups[2].Success||m.Groups[2].Value=="strategy-snapshot")||method=="POST"&&(m.Groups[2].Value=="strategy-watch"||m.Groups[2].Value=="stop");
 }
 static async Task Serve(HttpClient http){
  var security=new PipeSecurity();var user=WindowsIdentity.GetCurrent().User;
  security.SetAccessRuleProtection(true,false);security.SetOwner(user);security.AddAccessRule(new PipeAccessRule(user,PipeAccessRights.FullControl,AccessControlType.Allow));
  while(true){
   using(var pipe=new NamedPipeServerStream(PipeName,PipeDirection.InOut,1,PipeTransmissionMode.Byte,PipeOptions.Asynchronous,4096,4096,security)){
    await pipe.WaitForConnectionAsync();
    using(var reader=new StreamReader(pipe,new UTF8Encoding(false),false,4096,true))
    using(var writer=new StreamWriter(pipe,new UTF8Encoding(false),4096,true){AutoFlush=true}){
     string id=null;
     try {
      string line=await reader.ReadLineAsync();if(line==null||line.Length>500000)throw new InvalidOperationException("REQUEST_TOO_LARGE");
      var input=Json.Deserialize<Dictionary<string,object>>(line);id=(string)input["id"];
      string method=(string)input["method"],path=(string)input["path"];
      Guid parsed;
      if(!Guid.TryParse(id,out parsed)||!Allowed(method,path))throw new InvalidOperationException("ROUTE_NOT_PERMITTED");
      object body=null;input.TryGetValue("body",out body);
      var result=await Call(http,method,path,body);
      if(method=="POST"&&path=="/api/runner/solve"&&result.Status==202){
       var data=result.Data as Dictionary<string,object>;object solveId;
       if(data==null||!data.TryGetValue("solve_id",out solveId)||!(solveId is string)||!Regex.IsMatch((string)solveId,"^[a-zA-Z0-9_-]{1,100}$"))throw new InvalidOperationException("SOURCE_JOB_IDENTITY");
       Owned.Add((string)solveId);
      }
      await writer.WriteLineAsync(Json.Serialize(new {id=id,status=result.Status,data=Redact(result.Data)}));
     }catch(Exception ex){writer.WriteLine(Json.Serialize(new {id=id,status=502,data=new {error=ex is InvalidOperationException?ex.Message:"SOURCE_REQUEST_FAILED"}}));}
    }
   }
  }
 }
 static object Redact(object input){
  var dict=input as Dictionary<string,object>;
  if(dict!=null)return dict.Where(k=>!Regex.IsMatch(k.Key,"token|cookie|grant|email|secret|password|private_key|^argv$|^last_log_lines$",RegexOptions.IgnoreCase)).ToDictionary(k=>k.Key,k=>Redact(k.Value));
  var arr=input as object[];return arr!=null?(object)arr.Select(Redact).ToArray():input;
 }
}
