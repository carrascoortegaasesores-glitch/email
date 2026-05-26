import { useState, useRef, useCallback, useEffect } from "react";

// ─── Constantes ──────────────────────────────────────────────
const FIRM    = "Carrasco Ortega Asesores";
const FEMAIL  = "info@coasesores.es";
const MAX_CHARS = 6000;
const SK_EMPLEADOS  = "co_empleados_v1";
const SK_HISTORIAL  = "co_historial_v1";
const SK_EJEMPLOS   = "co_ejemplos_v3";

const COLORES_EMPLEADO = [
  "#2E74D0","#059669","#D97706","#7C3AED","#DC2626",
  "#0891B2","#BE185D","#65A30D","#EA580C","#6366F1",
];

const MATERIAS = [
  {id:"IVA",           label:"IVA",                         sub:"Mod. 303, 390, 347",          detail:"Materia: IVA. Modelos: 303 (trimestral), 390 (resumen anual), 347 (operaciones con terceros)."},
  {id:"Retenciones",   label:"Retenciones",                 sub:"Mod. 111, 115, 123 + anuales", detail:"Materia: Retenciones. Modelos: 111, 115, 123 y anuales 190, 180, 193."},
  {id:"IS",            label:"Impuesto de Sociedades",      sub:"Modelo 200",                   detail:"Materia: Impuesto de Sociedades. Modelo 200."},
  {id:"Nominas",       label:"Nóminas",                     sub:"Cálculo y gestión",             detail:"Materia: Nóminas. Cálculo, revisión y gestión."},
  {id:"Laboral",       label:"Laboral",                     sub:"Convenios y normativa",         detail:"Materia: Laboral. Convenios colectivos, contratos, despidos, finiquitos."},
  {id:"Contabilidad",  label:"Contabilidad",                sub:"Apuntes y criterios PGC",       detail:"Materia: Contabilidad. Apuntes y criterios PGC."},
  {id:"Notificaciones",label:"Explicador de notificaciones",sub:"AEAT, TGSS, organismos",       detail:"Materia: Notificación oficial (AEAT, TGSS u otro). Analiza el documento, explica qué significa, plazos y acción a tomar."},
  {id:"SS",            label:"Seguridad Social",            sub:"Trámites y cotizaciones",       detail:"Materia: Seguridad Social. Cotizaciones, altas/bajas, afiliación, trámites TGSS."},
  {id:"Otros",         label:"Otros",                       sub:"",                              detail:"Materia: Consulta no clasificada."},
];

const CLIENTS_RAW = [
  ["Adela Gomez Grau","A"],["Alexis Gomez Barcos","A"],["Ana Dexeus","A"],
  ["Anna Mikulin","A"],["Blas Fuentes Benito","A"],["Cintia Sanchez","A"],
  ["Dani Corpas","A"],["Diego Moreno Delgado","A"],["Gabriel Neamtu","A"],
  ["Guillermo Sanchez Gomis","A"],["Ignasi Gomis Canto","A"],["Iosif Neamtu","A"],
  ["Irene Miralles","A"],["Jasmina Becker","A"],["Jorge Viñoles","A"],
  ["Jose Luis Almiñana","A"],["Jose Luis Leon Lora","A"],["Josefa Bohigues","A"],
  ["Laura Atienza","A"],["Laura Lopez Delgado","A"],["Laura Olmos Año","A"],
  ["Lucia Perez Silvestre","A"],["Maria Martinez","A"],["Marta Alepuz","A"],
  ["Marta Carranza","A"],["Marta Senon","A"],["Miguel Carrasco Ortega","A"],
  ["Miguel Olmos","A"],["Miriam Casado Casañ","A"],["Nelson Castro","A"],
  ["Nestor Inglada Soler","A"],["Paola Rueda Castillo","A"],["Sophia Cecilia","A"],
  ["Teo Atienza","A"],["Vanesa Genis","A"],["Virginia y Javier Salar","A"],["Yin Warner","A"],
  ["Act. Alisios","E"],["ADA Arquitectura","E"],["Adenzo Promociones","E"],
  ["Alquerias Erreiz SL","E"],["Australe Urbana","E"],["Benicarlo 2 SL","E"],
  ["Botavara Alquileres","E"],["Carrasco Y Sanchez","E"],["Cisneria","E"],
  ["Clinica Gonzalez Alexandre","E"],["CO Inversiones","E"],
  ["Const. Ferrando Paredes SL","E"],["Control y Seguridad Mola","E"],
  ["CSSPLACK SL","E"],["Cultura Valenciana del Sonido","E"],["Escuela Alisios","E"],
  ["Estudio Puerto","E"],["Gos Alcan","E"],["Grupo Aprisko","E"],
  ["HISPANO GLOBAL SOLUTIONS","E"],["Inmovision Concept SL","E"],
  ["Juanzo Construcciones SL","E"],["L'Horta Sonora","E"],["MB2","E"],
  ["Omicron Urbana SA","E"],["Pavimentos Albufera","E"],["Poeta Monmeneu 18 SL","E"],
  ["Puerto Rico Projects","E"],["Raul Aznar","E"],["Ros Gestión de Activos","E"],
  ["Salexpress","E"],["Societat Musical la Unio de Sollana","E"],["Tenold 2025 SL","E"],
  ["The Green Theory SL","E"],["UTE Calle Lirio 11","E"],["Visitacion 8 SL","E"],
  ["Xito Digital Solutions","E"],
];
const BASE_CLIENTS = CLIENTS_RAW.map(([n,t])=>({n,t})).sort((a,b)=>a.n.localeCompare(b.n,"es"));

// ─── EML / PDF parsers ────────────────────────────────────────
function decodeQP(s){return s.replace(/=\r?\n/g,"").replace(/=([0-9A-Fa-f]{2})/g,(_,h)=>String.fromCharCode(parseInt(h,16)));}
function decodeB64s(s){try{return decodeURIComponent(escape(atob(s.replace(/\s/g,""))));}catch{return s;}}
function decodeEW(h){return h.replace(/=\?[^?]+\?([BQbq])\?([^?]*)\?=/g,(_,e,d)=>e.toUpperCase()==="B"?decodeB64s(d):d.replace(/_/g," ").replace(/=([0-9A-Fa-f]{2})/g,(_,h)=>String.fromCharCode(parseInt(h,16))));}
function extractPlain(body,bnd){
  const lines=body.split("\n");const secs=[];let cur="";
  for(const l of lines){if(l.startsWith("--"+bnd)){if(cur.trim())secs.push(cur);cur="";}else cur+=l+"\n";}
  if(cur.trim())secs.push(cur);
  for(const s of secs){const sp=s.indexOf("\n\n");if(sp===-1)continue;const sh=s.substring(0,sp),sb=s.substring(sp+2);if(!/content-type:\s*text\/plain/i.test(sh))continue;const enc=(sh.match(/content-transfer-encoding:\s*(\S+)/i)||[])[1]||"";const nb=(sh.match(/boundary="?([^";\r\n]+)"?/i)||[])[1];if(nb){const r=extractPlain(sb,nb.trim());if(r)return r;}if(enc.toLowerCase()==="quoted-printable")return decodeQP(sb);if(enc.toLowerCase()==="base64")return decodeB64s(sb);return sb;}
  for(const s of secs){const sp=s.indexOf("\n\n");if(sp===-1)continue;const sh=s.substring(0,sp),sb=s.substring(sp+2);if(!/content-type:\s*text\/html/i.test(sh))continue;const enc=(sh.match(/content-transfer-encoding:\s*(\S+)/i)||[])[1]||"";let h=enc.toLowerCase()==="quoted-printable"?decodeQP(sb):enc.toLowerCase()==="base64"?decodeB64s(sb):sb;return h.replace(/<br\s*\/?>/gi,"\n").replace(/<\/p>/gi,"\n").replace(/<[^>]+>/g,"").replace(/&nbsp;/g," ").replace(/&amp;/g,"&");}
  return body;
}
function cleanBody(t){return t.split("\n").filter(l=>{const x=l.trim();return !x.startsWith(">")&&!/^--[A-Za-z0-9_]/.test(x)&&!/^Content-(Type|Transfer|Disposition):/i.test(x)&&!/^MIME-Version:/i.test(x)&&!/^This is a multi-part message/i.test(x)&&!/^Your (email|mail) (application|client)/i.test(x);}).join("\n").replace(/\n{3,}/g,"\n\n").trim();}
async function parseEmlFile(file){
  const buf=await file.arrayBuffer();
  const l1=new TextDecoder("iso-8859-1").decode(buf);
  const sep=l1.indexOf("\n\n");const hdrBlock=sep!==-1?l1.substring(0,sep):l1.substring(0,2000);
  const csM=hdrBlock.match(/Content-Type:[^\n]*charset=["']?([^"';\s\r\n]+)/i);
  const cs=csM?csM[1].toLowerCase().trim():"utf-8";
  let raw;try{raw=new TextDecoder(cs).decode(buf);}catch{raw=new TextDecoder("utf-8").decode(buf);}
  const norm=raw.replace(/\r\n/g,"\n");const sp2=norm.indexOf("\n\n");if(sp2===-1)return norm.trim();
  const hdr=norm.substring(0,sp2),body=norm.substring(sp2+2);
  const subjM=hdr.match(/^Subject:\s*(.+(?:\n[ \t].+)*)/mi);const subject=subjM?decodeEW(subjM[1].replace(/\n[ \t]/g," ").trim()):"";
  const fromM=hdr.match(/^From:\s*(.+)/mi);const from=fromM?decodeEW(fromM[1].trim()):"";
  const ctM=hdr.match(/^Content-Type:\s*([^\n]+(?:\n[ \t][^\n]+)*)/mi);const mainCT=ctM?ctM[1].replace(/\n[ \t]/g," "):"";
  const bndM=mainCT.match(/boundary="?([^";\r\n]+)"?/i);const mainEnc=(hdr.match(/^Content-Transfer-Encoding:\s*(\S+)/mi)||[])[1]||"";
  let txt=bndM?extractPlain(body,bndM[1].trim()):body;
  if(!bndM){if(mainEnc.toLowerCase()==="quoted-printable")txt=decodeQP(txt);if(mainEnc.toLowerCase()==="base64")txt=decodeB64s(txt);}
  txt=cleanBody(txt);
  const parts=[];if(subject)parts.push(`Asunto: ${subject}`);if(from)parts.push(`De: ${from}`);if(parts.length)parts.push("");parts.push(txt);
  return parts.join("\n").trim();
}
async function loadPdfJs(){if(window.pdfjsLib)return window.pdfjsLib;return new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";s.onload=()=>{window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";res(window.pdfjsLib);};s.onerror=rej;document.head.appendChild(s);});}
async function parsePdfFile(file){const lib=await loadPdfJs();const buf=await file.arrayBuffer();const pdf=await lib.getDocument({data:buf}).promise;let text="";for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);const c=await page.getTextContent();text+=c.items.map(it=>it.str).join(" ")+"\n";}return text.trim();}

// ─── Storage helpers ──────────────────────────────────────────
async function sGet(key){try{const v=localStorage.getItem(key);return v?JSON.parse(v):null;}catch{return null;}}
async function sSet(key,val){try{localStorage.setItem(key,JSON.stringify(val));}catch{}}

// ─── Colores ─────────────────────────────────────────────────
const C={
  bg:"#EEF4FB",surface:"#FFFFFF",card:"#F4F8FF",
  blue900:"#0D2B5E",blue800:"#1A3D7C",blue700:"#1E4D96",
  blue600:"#1D5BAF",blue500:"#2E74D0",blue400:"#4A8FE8",
  blue200:"#93C5FD",blue100:"#DBEAFE",blue50:"#EFF6FF",
  text:"#0D2B5E",textMid:"#3A5A8C",textLight:"#7A9CC4",
  border:"#C3D9F5",border2:"#A8C5ED",
  okBg:"#ECFDF5",okBdr:"#6EE7B7",okText:"#065F46",
  warnBg:"#FFFBEB",warnBdr:"#FCD34D",warnText:"#92400E",
  errBg:"#FEF2F2",errBdr:"#FCA5A5",errText:"#B91C1C",
  gold:"#B07D1A",
};
const field={width:"100%",padding:"9px 13px",border:`1px solid ${C.border2}`,borderRadius:8,background:C.surface,color:C.text,fontSize:13,outline:"none"};

// ─── UI helpers ───────────────────────────────────────────────
const SLabel=({children})=>(<div style={{fontSize:11,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:C.textLight,marginBottom:14}}>{children}</div>);
const FLabel=({children})=>(<label style={{fontSize:12,color:C.textMid,display:"block",marginBottom:5,fontWeight:500}}>{children}</label>);
const Divider=()=>(<div style={{borderTop:`1px solid ${C.border}`,margin:"22px 0"}}/>);
const BtnPri=({children,onClick,disabled,style={}})=>(<button onClick={onClick} disabled={disabled} style={{cursor:disabled?"not-allowed":"pointer",border:"none",background:disabled?C.border2:`linear-gradient(135deg,${C.blue600},${C.blue800})`,color:disabled?C.textLight:"#fff",borderRadius:8,padding:"9px 18px",fontSize:12,fontWeight:700,boxShadow:disabled?"none":"0 2px 8px rgba(30,91,175,0.3)",transition:"all .15s",...style}}>{children}</button>);
const BtnSec=({children,onClick,style={}})=>(<button onClick={onClick} style={{cursor:"pointer",border:`1px solid ${C.border2}`,background:"transparent",color:C.textMid,borderRadius:8,padding:"9px 18px",fontSize:12,fontWeight:500,...style}}>{children}</button>);
const Alert=({type,children,visible})=>{if(!visible)return null;const st={warn:{bg:C.warnBg,bdr:C.warnBdr,text:C.warnText},err:{bg:C.errBg,bdr:C.errBdr,text:C.errText},ok:{bg:C.okBg,bdr:C.okBdr,text:C.okText}}[type];return(<div style={{background:st.bg,border:`1px solid ${st.bdr}`,borderRadius:8,padding:"10px 14px",fontSize:12,color:st.text,marginBottom:12}}>{children}</div>);};
const Spin=({c="#fff"})=>(<span style={{display:"inline-block",width:14,height:14,border:`2px solid rgba(255,255,255,.3)`,borderTopColor:c,borderRadius:"50%",animation:"spin .7s linear infinite"}}/>);
const Avatar=({nombre,color,size=32})=>{const ini=nombre.split(" ").map(w=>w[0]).join("").substring(0,2).toUpperCase();return(<div style={{width:size,height:size,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:size*0.35,fontWeight:700,color:"#fff",letterSpacing:"-.5px"}}>{ini}</div>);};

// ─── Pantalla de selección de empleado ───────────────────────
function PantallaEmpleado({empleados,onSelect,onAdd}){
  const [nombre,setNombre]=useState("");
  const [adding,setAdding]=useState(false);
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:440}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{width:56,height:56,background:`linear-gradient(135deg,${C.blue600},${C.blue900})`,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",boxShadow:"0 4px 16px rgba(30,91,175,0.35)"}}>
            <span style={{color:"#fff",fontWeight:800,fontSize:20}}>CO</span>
          </div>
          <div style={{fontWeight:700,fontSize:20,color:C.text}}>{FIRM}</div>
          <div style={{fontSize:12,color:C.textLight,marginTop:4}}>¿Quién va a trabajar hoy?</div>
        </div>

        <div style={{background:C.surface,borderRadius:16,boxShadow:"0 4px 24px rgba(13,43,94,0.1)",border:`1px solid ${C.border}`,overflow:"hidden"}}>
          <div style={{padding:"16px 20px",background:C.blue50,borderBottom:`1px solid ${C.border}`}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:"1.2px",textTransform:"uppercase",color:C.textLight}}>Selecciona tu perfil</div>
          </div>
          <div style={{padding:16,display:"flex",flexDirection:"column",gap:8}}>
            {empleados.length===0&&!adding&&(
              <div style={{textAlign:"center",padding:"20px 0",color:C.textLight,fontSize:13}}>No hay empleados registrados aún.<br/><span style={{fontSize:12}}>Añade el primero para empezar.</span></div>
            )}
            {empleados.map(emp=>(
              <button key={emp.id} onClick={()=>onSelect(emp)} style={{
                display:"flex",alignItems:"center",gap:12,padding:"12px 16px",
                background:C.card,border:`1px solid ${C.border}`,borderRadius:10,
                cursor:"pointer",textAlign:"left",transition:"all .15s",width:"100%",
              }}>
                <Avatar nombre={emp.nombre} color={emp.color} size={38}/>
                <div>
                  <div style={{fontWeight:600,fontSize:14,color:C.text}}>{emp.nombre}</div>
                  <div style={{fontSize:11,color:C.textLight,marginTop:1}}>{emp.consultas||0} consulta{(emp.consultas||0)!==1?"s":""} registrada{(emp.consultas||0)!==1?"s":""}</div>
                </div>
                <span style={{marginLeft:"auto",color:C.blue400,fontSize:18}}>→</span>
              </button>
            ))}

            {adding?(
              <div style={{padding:14,border:`1px dashed ${C.border2}`,borderRadius:10,background:C.card}}>
                <FLabel>Nombre del empleado</FLabel>
                <input autoFocus style={field} placeholder="Nombre completo" value={nombre} onChange={e=>setNombre(e.target.value)} onKeyDown={e=>e.key==="Enter"&&nombre.trim()&&onAdd(nombre.trim(),()=>{setNombre("");setAdding(false);})}/>
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  <BtnPri onClick={()=>nombre.trim()&&onAdd(nombre.trim(),()=>{setNombre("");setAdding(false);})} style={{flex:1,padding:9}}>Añadir</BtnPri>
                  <BtnSec onClick={()=>{setAdding(false);setNombre("");}} style={{padding:"9px 14px"}}>Cancelar</BtnSec>
                </div>
              </div>
            ):(
              <button onClick={()=>setAdding(true)} style={{
                display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                padding:"11px 16px",background:"transparent",
                border:`1px dashed ${C.border2}`,borderRadius:10,
                cursor:"pointer",color:C.textMid,fontSize:12,fontWeight:500,width:"100%",
              }}>
                <span style={{fontSize:16,color:C.blue400}}>＋</span> Añadir nuevo empleado
              </button>
            )}
          </div>
        </div>
        <div style={{textAlign:"center",marginTop:16,fontSize:11,color:C.textLight}}>
          Los datos son compartidos entre todos los miembros del equipo
        </div>
      </div>
    </div>
  );
}

// ─── Vista: Historial ─────────────────────────────────────────
function VistaHistorial({historial,empleados,empleadoActual}){
  const [filtroEmp,setFiltroEmp]=useState("todos");
  const [filtroMat,setFiltroMat]=useState("todas");
  const [expandido,setExpandido]=useState(null);

  const lista=[...historial].reverse().filter(h=>{
    if(filtroEmp!=="todos"&&h.empleadoId!==filtroEmp)return false;
    if(filtroMat!=="todas"&&!h.materias.includes(filtroMat))return false;
    return true;
  });

  return(
    <div>
      {/* Filtros */}
      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
        <select value={filtroEmp} onChange={e=>setFiltroEmp(e.target.value)}
          style={{...field,width:"auto",fontSize:12,padding:"7px 12px"}}>
          <option value="todos">Todos los empleados</option>
          {empleados.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <select value={filtroMat} onChange={e=>setFiltroMat(e.target.value)}
          style={{...field,width:"auto",fontSize:12,padding:"7px 12px"}}>
          <option value="todas">Todas las materias</option>
          {MATERIAS.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <div style={{marginLeft:"auto",fontSize:12,color:C.textLight,alignSelf:"center"}}>
          {lista.length} consulta{lista.length!==1?"s":""}
        </div>
      </div>

      {lista.length===0&&(
        <div style={{textAlign:"center",padding:"60px 20px",color:C.textLight}}>
          <div style={{fontSize:32,marginBottom:12}}>📭</div>
          <div style={{fontSize:14}}>No hay consultas registradas aún</div>
          <div style={{fontSize:12,marginTop:6}}>Las consultas generadas aparecerán aquí automáticamente</div>
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {lista.map(h=>{
          const emp=empleados.find(e=>e.id===h.empleadoId);
          const open=expandido===h.id;
          return(
            <div key={h.id} style={{background:C.surface,border:`1px solid ${C.border}`,
              borderRadius:12,overflow:"hidden",
              boxShadow:open?"0 4px 16px rgba(13,43,94,0.1)":"0 1px 4px rgba(13,43,94,0.05)"}}>
              {/* Cabecera */}
              <button onClick={()=>setExpandido(open?null:h.id)} style={{
                width:"100%",padding:"12px 16px",background:open?C.blue50:C.surface,
                border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:12,textAlign:"left",
              }}>
                {emp&&<Avatar nombre={emp.nombre} color={emp.color} size={32}/>}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <span style={{fontWeight:600,fontSize:13,color:C.text}}>{h.cliente}</span>
                    {h.guardado&&<span style={{fontSize:10,background:C.okBg,color:C.okText,border:`1px solid ${C.okBdr}`,borderRadius:4,padding:"1px 6px",fontWeight:600}}>✓ Ejemplo</span>}
                  </div>
                  <div style={{fontSize:11,color:C.textLight,marginTop:2,display:"flex",gap:8,flexWrap:"wrap"}}>
                    <span>{emp?.nombre||"Desconocido"}</span>
                    <span>·</span>
                    <span>{h.fecha}</span>
                    {h.materias.length>0&&<><span>·</span><span>{h.materias.map(id=>MATERIAS.find(m=>m.id===id)?.label||id).join(", ")}</span></>}
                  </div>
                </div>
                <span style={{color:C.textLight,fontSize:12,flexShrink:0}}>{open?"▲":"▼"}</span>
              </button>

              {/* Detalle expandido */}
              {open&&(
                <div style={{borderTop:`1px solid ${C.border}`,padding:16}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    <div>
                      <div style={{fontSize:11,fontWeight:600,color:C.textLight,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Email recibido</div>
                      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:12,
                        fontSize:12,color:C.textMid,lineHeight:1.65,maxHeight:180,overflowY:"auto",whiteSpace:"pre-wrap"}}>
                        {h.emailResumen||"(sin texto guardado)"}
                      </div>
                    </div>
                    <div>
                      <div style={{fontSize:11,fontWeight:600,color:C.textLight,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>Respuesta enviada</div>
                      <div style={{background:C.blue50,border:`1px solid ${C.blue100}`,borderRadius:8,padding:12,
                        fontSize:12,color:C.text,lineHeight:1.65,maxHeight:180,overflowY:"auto",whiteSpace:"pre-wrap"}}>
                        {h.respuesta}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Vista: Ejemplos por materia ──────────────────────────────
function VistaEjemplos({ejemplosPorMateria,onDelete,empleados}){
  const [matActiva,setMatActiva]=useState(null);
  const total=Object.values(ejemplosPorMateria).reduce((s,a)=>s+(a?.length||0),0);
  const conEjs=MATERIAS.filter(m=>(ejemplosPorMateria[m.id]||[]).length>0);

  return(
    <div>
      <div style={{background:C.blue50,border:`1px solid ${C.blue100}`,borderRadius:10,padding:"12px 16px",marginBottom:20,fontSize:12,color:C.blue600,lineHeight:1.7}}>
        <strong>¿Cómo funciona el aprendizaje?</strong><br/>
        Cuando alguien del equipo genera una respuesta y la guarda como ejemplo, queda almacenada aquí.
        La próxima vez que cualquier empleado genere una respuesta de la misma materia,
        el asistente recibirá esos ejemplos como referencia de tono y estilo.
        Cuantos más ejemplos por materia, más precisa la respuesta.
      </div>

      {total===0?(
        <div style={{textAlign:"center",padding:"60px 20px",color:C.textLight}}>
          <div style={{fontSize:32,marginBottom:12}}>📚</div>
          <div style={{fontSize:14}}>No hay ejemplos guardados aún</div>
          <div style={{fontSize:12,marginTop:6}}>Genera una respuesta, edítala si hace falta y pulsa "Guardar como ejemplo"</div>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {conEjs.map(m=>{
            const ejs=ejemplosPorMateria[m.id]||[];
            const open=matActiva===m.id;
            return(
              <div key={m.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
                <button onClick={()=>setMatActiva(open?null:m.id)} style={{
                  width:"100%",padding:"13px 18px",background:open?C.blue50:C.surface,
                  border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,
                      background:C.blue100,color:C.blue600,letterSpacing:".3px"}}>
                      {ejs.length} ejemplo{ejs.length!==1?"s":""}
                    </span>
                    <div style={{textAlign:"left"}}>
                      <div style={{fontWeight:600,fontSize:13,color:C.text}}>{m.label}</div>
                      {m.sub&&<div style={{fontSize:11,color:C.textLight}}>{m.sub}</div>}
                    </div>
                  </div>
                  <span style={{color:C.textLight,fontSize:12}}>{open?"▲":"▼"}</span>
                </button>
                {open&&(
                  <div style={{borderTop:`1px solid ${C.border}`,padding:12,display:"flex",flexDirection:"column",gap:8}}>
                    {ejs.map((ej,i)=>{
                      const emp=empleados.find(e=>e.nombre===ej.empleadoNombre);
                      return(
                        <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:12}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              {emp&&<Avatar nombre={emp.nombre} color={emp.color} size={22}/>}
                              <div style={{fontSize:11,color:C.textMid}}>
                                <strong>{ej.cliente}</strong>
                                <span style={{margin:"0 6px",opacity:.4}}>·</span>
                                <span style={{color:C.textLight}}>{ej.empleadoNombre}</span>
                                <span style={{margin:"0 6px",opacity:.4}}>·</span>
                                <span style={{color:C.textLight}}>{ej.fecha}</span>
                              </div>
                            </div>
                            <button onClick={()=>onDelete(m.id,i)} style={{background:"none",border:`1px solid ${C.border}`,cursor:"pointer",fontSize:11,color:C.textLight,padding:"2px 8px",borderRadius:5}}>Eliminar</button>
                          </div>
                          <div style={{fontSize:12,color:C.textMid,whiteSpace:"pre-wrap",lineHeight:1.65}}>
                            {ej.texto}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── App principal ────────────────────────────────────────────
export default function App(){
  const [empleados,setEmpleados]=useState([]);
  const [empleadoActual,setEmpleadoActual]=useState(null);
  const [historial,setHistorial]=useState([]);
  const [ejemplosPorMateria,setEjemplosPorMateria]=useState({});
  const [tab,setTab]=useState("consulta");
  const [clients,setClients]=useState(BASE_CLIENTS);
  const [selClient,setSelClient]=useState("");
  const [showNew,setShowNew]=useState(false);
  const [newName,setNewName]=useState("");
  const [newType,setNewType]=useState(null);
  const [extraCtx,setExtraCtx]=useState("");
  const [topics,setTopics]=useState([]);
  const [emailText,setEmailText]=useState("");
  const [fileName,setFileName]=useState("");
  const [isDragging,setIsDragging]=useState(false);
  const [pdfLoading,setPdfLoading]=useState(false);
  const [truncated,setTruncated]=useState(false);
  const [loading,setLoading]=useState(false);
  const [response,setResponse]=useState("");
  const [error,setError]=useState("");
  const [copied,setCopied]=useState(false);
  const [savedOk,setSavedOk]=useState(false);
  const responseRef=useRef(null);

  // Cargar datos compartidos al montar
  useEffect(()=>{
    (async()=>{
      const emps=await sGet(SK_EMPLEADOS)||[];
      const hist=await sGet(SK_HISTORIAL)||[];
      const ejs=await sGet(SK_EJEMPLOS)||{};
      setEmpleados(emps);
      setHistorial(hist);
      setEjemplosPorMateria(ejs);
    })();
  },[]);

  const addEmpleado=async(nombre,cb)=>{
    const color=COLORES_EMPLEADO[empleados.length%COLORES_EMPLEADO.length];
    const emp={id:Date.now().toString(),nombre,color,consultas:0};
    const next=[...empleados,emp];
    await sSet(SK_EMPLEADOS,next);
    setEmpleados(next);
    cb&&cb();
  };

  const selectEmpleado=(emp)=>setEmpleadoActual(emp);
  const cambiarEmpleado=()=>{setEmpleadoActual(null);setTab("consulta");reset();};

  const totalEjemplos=Object.values(ejemplosPorMateria).reduce((s,a)=>s+(a?.length||0),0);
  const clientObj=clients.find(c=>c.n===selClient)||null;
  const autonomos=clients.filter(c=>c.t==="A");
  const empresas=clients.filter(c=>c.t==="E");

  const handleSelectChange=(e)=>{const v=e.target.value;if(v==="__new__"){setShowNew(true);setSelClient("");}else{setSelClient(v);setShowNew(false);}};
  const confirmNew=()=>{if(!newName.trim()){alert("Escribe el nombre.");return;}if(!newType){alert("Selecciona tipo.");return;}const c={n:newName.trim(),t:newType};setClients(prev=>[...prev,c].sort((a,b)=>a.n.localeCompare(b.n,"es")));setSelClient(c.n);setShowNew(false);setNewName("");setNewType(null);};
  const toggleTopic=(id)=>setTopics(prev=>prev.includes(id)?[]:[id]);

  const processFile=useCallback(async(file)=>{
    setError("");
    try{
      let text="";const name=file.name.toLowerCase();
      if(name.endsWith(".eml")||file.type==="message/rfc822")text=await parseEmlFile(file);
      else if(name.endsWith(".pdf")||file.type==="application/pdf"){setPdfLoading(true);text=await parsePdfFile(file);setPdfLoading(false);}
      else text=await file.text();
      setTruncated(text.length>MAX_CHARS);setEmailText(text);setFileName(file.name);
    }catch(e){setPdfLoading(false);setError("Error al leer el archivo: "+e.message);}
  },[]);

  const handleDrop=useCallback(async(e)=>{
    e.preventDefault();setIsDragging(false);
    const file=e.dataTransfer.files?.[0];
    if(file){processFile(file);return;}
    const text=e.dataTransfer.getData("text/plain");
    if(text){setEmailText(text);setFileName("");setTruncated(text.length>MAX_CHARS);}
  },[processFile]);

  const clearContent=()=>{setEmailText("");setFileName("");setTruncated(false);};

  const buildSystem=()=>{
    let sys=`Eres el equipo de ${FIRM}, asesoría especializada en fiscal, contable y laboral en España.
- Responde SIEMPRE en español.
- Tono profesional pero cercano.
- Estructura: saluda por nombre → responde directamente → indica siguiente paso → cierra con oferta de ayuda.
- Si hay riesgo fiscal, legal o de plazo, menciónalo brevemente.
- Si falta información, indícalo.
- Firma: "El equipo de ${FIRM}\\n${FEMAIL}"
- Texto listo para enviar.`;
    const ejsRel=[];
    topics.forEach(tid=>{(ejemplosPorMateria[tid]||[]).slice(-3).forEach(ej=>ejsRel.push({...ej,matLabel:MATERIAS.find(m=>m.id===tid)?.label}));});
    if(ejsRel.length>0){
      sys+=`\n\nEJEMPLOS DE RESPUESTAS VALIDADAS POR EL EQUIPO — úsalos como referencia exacta de tono y estructura:\n`;
      ejsRel.forEach((ej,i)=>{sys+=`\n--- Ejemplo ${i+1} · ${ej.matLabel} · ${ej.cliente} (${ej.empleadoNombre}) ---\n${ej.texto}\n`;});
      sys+=`\nAdapta tu respuesta al estilo de estos ejemplos.`;
    }
    return sys;
  };

  const buildPrompt=()=>{
    const name=clientObj?clientObj.n:"No especificado";
    const type=clientObj?(clientObj.t==="E"?"Empresa":"Autónomo"):"No especificado";
    const tLines=topics.map(id=>MATERIAS.find(m=>m.id===id)?.detail||id).join("\n");
    const txt=emailText.trim().substring(0,MAX_CHARS);
    return[`Nombre del cliente: ${name}`,`Tipo de cliente: ${type}`,tLines,extraCtx?`Contexto: ${extraCtx}`:"","","Email o documento recibido:","---",txt,"---","","Redacta una propuesta de respuesta profesional, lista para revisar y enviar."].filter(Boolean).join("\n");
  };

  const generate=async()=>{
    if(!emailText.trim()){setError("Añade el texto del email.");return;}
    setError("");setLoading(true);setResponse("");setSavedOk(false);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:buildSystem(),messages:[{role:"user",content:buildPrompt()}]})});
      const data=await res.json();
      if(data.content?.[0]?.text){
        setResponse(data.content[0].text);
        // Guardar en historial automáticamente
        const entrada={
          id:Date.now().toString(),
          empleadoId:empleadoActual.id,
          empleadoNombre:empleadoActual.nombre,
          cliente:clientObj?clientObj.n:"No especificado",
          materias:topics,
          emailResumen:emailText.trim().substring(0,500),
          respuesta:data.content[0].text,
          fecha:new Date().toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"}),
          guardado:false,
        };
        const nextHist=[...historial,entrada];
        await sSet(SK_HISTORIAL,nextHist);
        setHistorial(nextHist);
        // Actualizar contador del empleado
        const nextEmps=empleados.map(e=>e.id===empleadoActual.id?{...e,consultas:(e.consultas||0)+1}:e);
        await sSet(SK_EMPLEADOS,nextEmps);
        setEmpleados(nextEmps);
        setTimeout(()=>responseRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),120);
      }else setError("Error API: "+(data.error?.message||JSON.stringify(data)));
    }catch(e){setError("Error de red: "+e.message);}
    finally{setLoading(false);}
  };

  const guardarEjemplo=async()=>{
    if(!response.trim())return;
    const nuevo={cliente:clientObj?clientObj.n:"(sin cliente)",texto:response.trim(),fecha:new Date().toLocaleDateString("es-ES",{day:"2-digit",month:"2-digit",year:"2-digit"}),empleadoNombre:empleadoActual.nombre};
    const destinos=topics.length>0?topics:["Otros"];
    const next={...ejemplosPorMateria};
    destinos.forEach(tid=>{next[tid]=[...(next[tid]||[]),nuevo];});
    await sSet(SK_EJEMPLOS,next);
    setEjemplosPorMateria(next);
    // Marcar entrada como guardada en historial
    const nextHist=historial.map(h=>h.respuesta===response?{...h,guardado:true}:h);
    await sSet(SK_HISTORIAL,nextHist);
    setHistorial(nextHist);
    setSavedOk(true);
  };

  const deleteEjemplo=async(matId,idx)=>{
    const next={...ejemplosPorMateria};
    next[matId]=(next[matId]||[]).filter((_,i)=>i!==idx);
    if(next[matId].length===0)delete next[matId];
    await sSet(SK_EJEMPLOS,next);
    setEjemplosPorMateria(next);
  };

  const copy=()=>{navigator.clipboard.writeText(response).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2200);});};
  const reset=()=>{setSelClient("");setShowNew(false);setNewName("");setNewType(null);setExtraCtx("");setTopics([]);clearContent();setResponse("");setError("");setCopied(false);setSavedOk(false);};

  // ── Pantalla empleado ──
  if(!empleadoActual)return(<><style>{`@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box;}`}</style><PantallaEmpleado empleados={empleados} onSelect={selectEmpleado} onAdd={addEmpleado}/></>);

  const TABS=[{id:"consulta",label:"Nueva consulta",icon:"✉️"},{id:"historial",label:"Historial",icon:"📋",badge:historial.length},{id:"ejemplos",label:"Ejemplos",icon:"📚",badge:totalEjemplos}];

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Helvetica Neue',Arial,sans-serif",color:C.text}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box;}input::placeholder,textarea::placeholder{color:#7A9CC4;}`}</style>

      {/* ── Header ── */}
      <div style={{background:`linear-gradient(135deg,${C.blue900},${C.blue800})`,padding:"0 32px",position:"sticky",top:0,zIndex:20,boxShadow:"0 2px 12px rgba(13,43,94,0.3)"}}>
        <div style={{maxWidth:860,margin:"0 auto"}}>
          <div style={{height:60,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:36,height:36,background:"rgba(255,255,255,0.15)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid rgba(255,255,255,0.25)"}}>
                <span style={{color:"#fff",fontWeight:800,fontSize:12}}>CO</span>
              </div>
              <div>
                <div style={{fontWeight:700,fontSize:14,color:"#fff"}}>{FIRM}</div>
                <div style={{fontSize:10,color:C.blue200,letterSpacing:".5px"}}>Asistente de correspondencia</div>
              </div>
            </div>
            <button onClick={cambiarEmpleado} style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:20,padding:"5px 12px 5px 6px",cursor:"pointer"}}>
              <Avatar nombre={empleadoActual.nombre} color={empleadoActual.color} size={26}/>
              <span style={{fontSize:12,color:"#fff",fontWeight:500}}>{empleadoActual.nombre}</span>
              <span style={{fontSize:10,color:"rgba(255,255,255,.5)"}}>▼</span>
            </button>
          </div>
          {/* Tabs */}
          <div style={{display:"flex",gap:2,paddingBottom:0}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{
                padding:"10px 18px",background:"transparent",border:"none",cursor:"pointer",
                color:tab===t.id?"#fff":C.blue200,fontWeight:tab===t.id?700:400,fontSize:12,
                borderBottom:tab===t.id?`2px solid #fff`:"2px solid transparent",
                display:"flex",alignItems:"center",gap:6,transition:"all .15s",
              }}>
                <span>{t.icon}</span>
                <span>{t.label}</span>
                {t.badge>0&&<span style={{background:"rgba(255,255,255,.2)",borderRadius:10,padding:"1px 6px",fontSize:10,fontWeight:700}}>{t.badge}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:860,margin:"0 auto",padding:"32px 32px 100px"}}>

        {/* ── TAB: HISTORIAL ── */}
        {tab==="historial"&&<VistaHistorial historial={historial} empleados={empleados} empleadoActual={empleadoActual}/>}

        {/* ── TAB: EJEMPLOS ── */}
        {tab==="ejemplos"&&<VistaEjemplos ejemplosPorMateria={ejemplosPorMateria} onDelete={deleteEjemplo} empleados={empleados}/>}

        {/* ── TAB: NUEVA CONSULTA ── */}
        {tab==="consulta"&&(<>

          {/* 1. CLIENTE */}
          <div style={{background:C.surface,borderRadius:14,padding:24,marginBottom:14,boxShadow:"0 1px 6px rgba(13,43,94,0.07)",border:`1px solid ${C.border}`}}>
            <SLabel>Cliente</SLabel>

            {/* Desplegable + tipo + botón nuevo */}
            <div style={{display:"flex",gap:10,marginBottom:14,alignItems:"flex-end",flexWrap:"wrap"}}>
              <div style={{flex:2,minWidth:160}}>
                <FLabel>Seleccionar cliente</FLabel>
                <select style={{...field,cursor:"pointer"}} value={selClient} onChange={e=>{setSelClient(e.target.value);setShowNew(false);}}>
                  <option value="">— Selecciona un cliente —</option>
                  <optgroup label="— Autónomos">{autonomos.map(c=><option key={c.n} value={c.n}>{c.n}</option>)}</optgroup>
                  <optgroup label="— Empresas">{empresas.map(c=><option key={c.n} value={c.n}>{c.n}</option>)}</optgroup>
                </select>
              </div>
              <div style={{flex:1,minWidth:100}}>
                <FLabel>Tipo</FLabel>
                <div style={{...field,minHeight:38,display:"flex",alignItems:"center",background:C.card}}>
                  {clientObj?(<span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:5,letterSpacing:".5px",background:clientObj.t==="E"?C.blue100:C.okBg,color:clientObj.t==="E"?C.blue600:C.okText,border:`1px solid ${clientObj.t==="E"?C.blue200:C.okBdr}`}}>{clientObj.t==="E"?"EMPRESA":"AUTÓNOMO"}</span>):<span style={{color:C.textLight,fontSize:12}}>—</span>}
                </div>
              </div>
              <div>
                <button onClick={()=>{setShowNew(o=>!o);setSelClient("");}} style={{
                  cursor:"pointer",height:38,padding:"0 14px",
                  background:showNew?C.border2:`linear-gradient(135deg,${C.blue600},${C.blue800})`,
                  color:showNew?C.textMid:"#fff",border:"none",borderRadius:8,
                  fontSize:12,fontWeight:700,whiteSpace:"nowrap",
                  boxShadow:showNew?"none":"0 2px 6px rgba(30,91,175,0.3)",
                }}>
                  {showNew?"✕ Cancelar":"＋ Nuevo cliente"}
                </button>
              </div>
            </div>

            {/* Formulario nuevo cliente */}
            {showNew&&(
              <div style={{padding:16,border:`1px solid ${C.blue200}`,borderRadius:10,background:C.blue50,marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:700,color:C.blue600,marginBottom:12}}>👤 Datos del nuevo cliente</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <div>
                    <FLabel>Nombre o razón social</FLabel>
                    <input style={field} placeholder="Ej: Transportes López SL" value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&confirmNew()}/>
                  </div>
                  <div>
                    <FLabel>Tipo de cliente</FLabel>
                    <div style={{display:"flex",gap:8,marginTop:2}}>
                      {[["empresa","🏢 Empresa",C.blue100,C.blue600],["autonomo","👤 Autónomo",C.okBg,C.okText]].map(([val,label,bg,col])=>(
                        <button key={val} onClick={()=>setNewType(val)} style={{flex:1,padding:"9px 0",border:`1px solid ${newType===val?col:C.border2}`,borderRadius:8,cursor:"pointer",fontSize:11,background:newType===val?bg:"white",color:newType===val?col:C.textMid,fontWeight:newType===val?700:400}}>{label}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <BtnPri onClick={confirmNew} style={{width:"100%",padding:11,fontSize:13}}>Confirmar y añadir cliente</BtnPri>
              </div>
            )}

            {/* Contexto adicional */}
            <div>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                <FLabel style={{marginBottom:0}}>Contexto adicional</FLabel>
                <span style={{fontSize:10,color:C.textLight}}>(opcional)</span>
              </div>
              <input style={field} placeholder="Ej: primer año de actividad · cliente con deuda pendiente · ya avisamos en enero..." value={extraCtx} onChange={e=>setExtraCtx(e.target.value)}/>
              <div style={{fontSize:11,color:C.textLight,marginTop:6,lineHeight:1.5,background:C.blue50,border:`1px solid ${C.blue100}`,borderRadius:6,padding:"7px 10px"}}>
                💡 Información interna tuya que ayuda a personalizar la respuesta — el cliente no la verá nunca. Ej: <em>"lleva 3 meses sin pagar"</em>, <em>"es su primer año como autónomo"</em>, <em>"ya le notificamos esto en marzo"</em>.
              </div>
            </div>
          </div>

          {/* 2. MATERIA */}
          <div style={{background:C.surface,borderRadius:14,padding:24,marginBottom:14,boxShadow:"0 1px 6px rgba(13,43,94,0.07)",border:`1px solid ${C.border}`}}>
            <SLabel>Materia de la consulta</SLabel>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {MATERIAS.map(m=>{
                const on=topics.includes(m.id);
                const ejCount=(ejemplosPorMateria[m.id]||[]).length;
                return(
                  <button key={m.id} onClick={()=>toggleTopic(m.id)} style={{cursor:"pointer",textAlign:"left",lineHeight:1.35,padding:"7px 13px",borderRadius:8,fontSize:12,border:`1px solid ${on?C.blue500:C.border2}`,background:on?`linear-gradient(135deg,${C.blue500},${C.blue800})`:"transparent",color:on?"#fff":C.textMid,boxShadow:on?"0 2px 6px rgba(30,91,175,0.25)":"none",transition:"all .15s",position:"relative"}}>
                    <span>{m.label}</span>
                    {m.sub&&<span style={{display:"block",fontSize:10,opacity:on?.8:.6,marginTop:2}}>{m.sub}</span>}
                    {ejCount>0&&<span style={{position:"absolute",top:-6,right:-6,background:on?"#fff":C.blue500,color:on?C.blue600:"#fff",fontSize:9,fontWeight:700,width:16,height:16,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${on?C.blue200:"transparent"}`}}>{ejCount}</span>}
                  </button>
                );
              })}
            </div>
            {topics.length>0&&(
              <div style={{marginTop:12,padding:"8px 12px",background:C.blue50,borderRadius:8,border:`1px solid ${C.blue100}`,fontSize:11,color:C.blue600}}>
                {topics.reduce((t,id)=>t+(ejemplosPorMateria[id]||[]).length,0)>0
                  ?`✓ Se cargarán ${topics.reduce((t,id)=>t+(ejemplosPorMateria[id]||[]).length,0)} ejemplos del equipo como referencia`
                  :"Sin ejemplos aún para estas materias · guarda respuestas buenas para mejorar la precisión"}
              </div>
            )}
          </div>

          {/* 3. EMAIL */}
          <div style={{background:C.surface,borderRadius:14,padding:24,marginBottom:14,boxShadow:"0 1px 6px rgba(13,43,94,0.07)",border:`1px solid ${C.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <SLabel>Email o documento recibido</SLabel>
              <span style={{fontSize:11,color:C.textLight}}>{emailText.length} car.</span>
            </div>
            <Alert type="warn" visible={truncated}>⚠ Contenido muy largo. Se usarán los primeros {MAX_CHARS.toLocaleString()} caracteres.</Alert>
            <div onDragOver={e=>{e.preventDefault();setIsDragging(true);}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setIsDragging(false);}} onDrop={handleDrop}
              style={{border:`2px dashed ${isDragging?C.blue500:C.border}`,borderRadius:10,padding:16,background:isDragging?C.blue50:C.card,transition:"all .15s"}}>
              {!emailText&&!pdfLoading&&(
                <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:12,padding:"14px 16px",background:C.blue50,borderRadius:8,border:`1px solid ${C.blue100}`}}>
                  <span style={{fontSize:22,flexShrink:0}}>📧</span>
                  <div><div style={{fontSize:13,color:C.blue600,fontWeight:500}}>Arrastra aquí el <strong>.eml</strong> desde Thunderbird o un <strong>PDF</strong></div><div style={{fontSize:11,marginTop:3,color:C.textLight}}>O pega el texto directamente abajo</div></div>
                </div>
              )}
              {pdfLoading&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,fontSize:12,color:C.textMid}}><Spin c={C.blue600}/>Leyendo PDF...</div>}
              {fileName&&(
                <div style={{display:"flex",alignItems:"center",gap:8,background:C.blue50,border:`1px solid ${C.blue200}`,borderRadius:6,padding:"7px 12px",fontSize:11,marginBottom:10}}>
                  <span>📎</span><span style={{fontWeight:600,color:C.blue600}}>{fileName}</span><span style={{color:C.textLight}}>· cargado</span>
                  <button onClick={clearContent} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:C.textLight,padding:"0 3px",marginLeft:"auto"}}>✕</button>
                </div>
              )}
              <textarea value={emailText} onChange={e=>{setEmailText(e.target.value);setTruncated(e.target.value.length>MAX_CHARS);}} placeholder="O pega el texto del email aquí..."
                style={{...field,minHeight:150,resize:"vertical",lineHeight:1.7,border:"none",padding:"4px 0",outline:"none",background:"transparent"}}/>
            </div>
          </div>

          <Alert type="err" visible={!!error}>{error}</Alert>

          <BtnPri onClick={generate} disabled={loading} style={{width:"100%",padding:16,fontSize:13,borderRadius:10,letterSpacing:".5px",boxShadow:"0 4px 14px rgba(30,91,175,0.35)"}}>
            {loading?<span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}><Spin/>Generando propuesta...</span>:"Generar propuesta de respuesta"}
          </BtnPri>

          {/* RESPUESTA */}
          {response&&(
            <div ref={responseRef} style={{marginTop:24}}>
              <div style={{background:C.surface,borderRadius:14,overflow:"hidden",boxShadow:"0 4px 20px rgba(13,43,94,0.12)",border:`1px solid ${C.border}`}}>
                <div style={{background:`linear-gradient(135deg,${C.blue900},${C.blue800})`,padding:"16px 22px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                  <div>
                    <div style={{fontSize:11,color:C.blue200,letterSpacing:"1.2px",textTransform:"uppercase",fontWeight:600,marginBottom:3}}>Propuesta generada · {empleadoActual.nombre}</div>
                    <div style={{fontSize:15,fontWeight:700,color:"#fff"}}>Revisa y edita antes de enviar</div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={copy} style={{cursor:"pointer",border:"1px solid rgba(255,255,255,.3)",background:"rgba(255,255,255,.12)",color:"#fff",borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:600}}>{copied?"✓ Copiado":"Copiar texto"}</button>
                    <button onClick={reset} style={{cursor:"pointer",border:"1px solid rgba(255,255,255,.2)",background:"transparent",color:"rgba(255,255,255,.7)",borderRadius:8,padding:"7px 14px",fontSize:12}}>Nueva consulta</button>
                  </div>
                </div>
                <div style={{background:C.blue50,borderBottom:`1px solid ${C.border}`,padding:"8px 20px",display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:10,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:C.gold,border:`1px solid ${C.gold}`,padding:"2px 8px",borderRadius:4}}>Borrador</span>
                  <span style={{fontSize:11,color:C.textLight}}>Editable · verifica los datos antes de enviar</span>
                </div>
                <textarea value={response} onChange={e=>setResponse(e.target.value)}
                  style={{...field,minHeight:300,padding:22,border:"none",background:C.surface,lineHeight:1.85,outline:"none",resize:"vertical"}}/>
                <div style={{padding:"14px 20px",background:C.card,borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                  {savedOk?(
                    <div style={{fontSize:12,color:C.okText,fontWeight:600}}>✓ Guardada en {topics.length>0?topics.map(id=>MATERIAS.find(m=>m.id===id)?.label).join(" y "):"Otros"} · el equipo la usará como referencia</div>
                  ):(
                    <div style={{fontSize:12,color:C.textMid}}>
                      <strong style={{color:C.text}}>¿Esta respuesta es buena?</strong> Edítala si hace falta y guárdala.
                      <div style={{fontSize:11,color:C.textLight,marginTop:2}}>Se guardará en: <strong>{topics.length>0?topics.map(id=>MATERIAS.find(m=>m.id===id)?.label).join(", "):"Otros"}</strong> · visible para todo el equipo</div>
                    </div>
                  )}
                  {!savedOk&&<button onClick={guardarEjemplo} style={{cursor:"pointer",background:`linear-gradient(135deg,${C.blue500},${C.blue600})`,border:"none",borderRadius:8,padding:"9px 18px",color:"#fff",fontSize:12,fontWeight:700,boxShadow:"0 2px 6px rgba(30,91,175,0.3)",whiteSpace:"nowrap"}}>📚 Guardar como ejemplo</button>}
                </div>
              </div>
              <div style={{marginTop:12,background:C.blue50,border:`1px solid ${C.blue200}`,borderRadius:8,padding:"10px 14px"}}>
                <span style={{fontSize:12,color:C.blue600}}><strong>Siguiente paso:</strong> Copia el texto y pégalo en IONOS para enviarlo desde tu cuenta habitual.</span>
              </div>
              <div style={{display:"flex",gap:8,marginTop:12}}>
                <BtnSec onClick={generate}>↺ Regenerar</BtnSec>
                <BtnSec onClick={reset}>+ Nueva consulta</BtnSec>
              </div>
            </div>
          )}
        </>)}
      </div>
    </div>
  );
}
