const $=s=>document.querySelector(s);
const input=$("#input"),issues=$("#issues"),summary=$("#summary"),score=$("#score"),bytes=$("#bytes");
const schema="https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json";
const example={"$schema":schema,"name":"io.github.username/weather-mcp","title":"Weather MCP Server","description":"Get current weather and forecasts for a requested location.","version":"1.0.0","repository":{"url":"https://github.com/username/weather-mcp","source":"github"},"packages":[{"registryType":"npm","identifier":"@username/weather-mcp","version":"1.0.0","transport":{"type":"stdio"},"environmentVariables":[{"name":"WEATHER_API_KEY","description":"API key for the weather provider","isSecret":true}]}]};
function add(list,type,title,detail){list.push({type,title,detail})}
function validUrl(v,https=false){try{const u=new URL(v);return !https||u.protocol==="https:"}catch{return false}}
function validate(){
  const raw=input.value.trim(),list=[];let data;
  if(!raw){render([{type:"error",title:"No JSON to validate",detail:"Paste a server.json document first."}]);return}
  try{data=JSON.parse(raw)}catch(e){render([{type:"error",title:"Invalid JSON syntax",detail:e.message}]);return}
  const size=new TextEncoder().encode(raw).length;
  if(size>4096)add(list,"error","File exceeds the 4 KB limit",`${size.toLocaleString()} bytes will not be accepted by the official registry.`);
  else add(list,"pass","File size is within the limit",`${size.toLocaleString()} of 4,096 bytes used.`);
  if(data.$schema!==schema)add(list,"warning","Use the current official schema",`Set $schema to ${schema}`);
  else add(list,"pass","Current schema reference","Using the official 2025-12-11 server schema.");
  if(typeof data.name!=="string"||!data.name.trim())add(list,"error","Missing server name","Add a globally unique registry name.");
  else if(!/^[a-z0-9][a-z0-9.-]*\/[A-Za-z0-9._-]+$/.test(data.name))add(list,"warning","Review the registry name","Prefer a namespace/name such as io.github.username/my-mcp.");
  else add(list,"pass","Registry name looks valid",data.name);
  if(typeof data.description!=="string"||data.description.trim().length<10)add(list,"error","Description is missing or too short","Explain the server's purpose in a useful sentence.");
  if(typeof data.version!=="string"||!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(data.version||""))add(list,"error","Version should be semver","Use a version such as 1.0.0.");
  if(data.repository&&!validUrl(data.repository.url))add(list,"error","Repository URL is invalid","repository.url must be an absolute URI.");
  if("registry_type" in data)add(list,"error","Use registryType, not registry_type","MCP Registry JSON fields use lower camel case.");
  const targets=[...(Array.isArray(data.packages)?data.packages:[]),...(Array.isArray(data.remotes)?data.remotes:[])];
  if(!targets.length)add(list,"error","Add a package or remote","At least one distribution target is required.");
  (data.packages||[]).forEach((p,i)=>{
    if(!["npm","pypi","oci","nuget","mcpb"].includes(p.registryType))add(list,"error",`Package ${i+1}: unsupported registryType`,"Use npm, pypi, oci, nuget, or mcpb.");
    if(!p.identifier)add(list,"error",`Package ${i+1}: missing identifier`,"Declare the package name in its registry.");
    if(p.version!==data.version)add(list,"warning",`Package ${i+1}: version mismatch`,`Package ${p.version||"(missing)"} differs from server ${data.version||"(missing)"}.`);
    if(!p.transport?.type)add(list,"error",`Package ${i+1}: missing transport`,"Declare the package transport, normally stdio.");
  });
  (data.remotes||[]).forEach((r,i)=>{
    if(!validUrl(r.url,true))add(list,"error",`Remote ${i+1}: use an HTTPS URL`,"Public remote MCP endpoints should use HTTPS.");
    if(r.type&&r.type!=="streamable-http"&&r.type!=="sse")add(list,"warning",`Remote ${i+1}: review transport type`,"Current remote servers normally use streamable-http; SSE is legacy.");
  });
  const secret=/\b(sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[A-Z0-9]{12,}|Bearer\s+[A-Za-z0-9._-]{12,})\b/;
  if(secret.test(raw))add(list,"error","Possible credential embedded","Replace real secret values with declared secret variables.");
  if(/\b(localhost|127\.0\.0\.1)\b/.test(raw))add(list,"warning","Local endpoint found","Registry consumers cannot reach localhost on your machine.");
  if(!list.some(x=>x.type==="error"))add(list,"pass","Ready for official validation","Run mcp-publisher validation as the final source of truth.");
  render(list);
}
function render(list){
  const errors=list.filter(x=>x.type==="error").length,warnings=list.filter(x=>x.type==="warning").length,passes=list.filter(x=>x.type==="pass").length;
  const value=Math.max(0,100-errors*20-warnings*7),state=errors?"bad":warnings?"warn":"good";
  score.textContent=value;score.className=`score ${state}`;summary.className=`summary ${state}`;
  summary.innerHTML=`<strong>${errors?`${errors} blocking issue${errors>1?"s":""}`:warnings?`Valid with ${warnings} recommendation${warnings>1?"s":""}`:"Publish preflight passed"}</strong><p>${passes} checks passed · ${warnings} warnings · ${errors} errors</p>`;
  issues.innerHTML=list.map(x=>`<div class="issue ${x.type}"><b>${x.type.toUpperCase()}</b><strong>${escapeHtml(x.title)}</strong><p>${escapeHtml(x.detail)}</p></div>`).join("");
}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function count(){const n=new TextEncoder().encode(input.value).length;bytes.textContent=`${n.toLocaleString()} B / 4 KB`;bytes.style.color=n>4096?"#e74832":""}
$("#example").onclick=()=>{input.value=JSON.stringify(example,null,2);count();validate()};
$("#clear").onclick=()=>{input.value="";count();score.textContent="—";score.className="score idle";summary.className="summary idle";summary.innerHTML="<strong>Waiting for metadata</strong><p>Paste a server.json document or load the official-style example.</p>";issues.innerHTML=""};
$("#validate").onclick=validate;input.addEventListener("input",count);
document.addEventListener("keydown",e=>{if((e.metaKey||e.ctrlKey)&&e.key==="Enter"){e.preventDefault();validate()}});
$("#generator-form").addEventListener("submit",e=>{e.preventDefault();const v=$("#g-version").value.trim(),o={"$schema":schema,name:$("#g-name").value.trim(),title:$("#g-title").value.trim()||undefined,description:$("#g-description").value.trim(),version:v,packages:[{registryType:$("#g-registry").value,identifier:$("#g-package").value.trim(),version:v,transport:{type:"stdio"}}]};if(!o.title)delete o.title;input.value=JSON.stringify(o,null,2);count();validate();location.hash="validator"});
input.value=JSON.stringify(example,null,2);count();
