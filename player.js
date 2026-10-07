import {API_BASE} from './config.js';

const $=id=>document.getElementById(id);
const state={apiBase:'',token:null,player:null,expiresAt:null,config:null,session:0,busy:false,refreshing:false,configEpoch:0,expiryTimer:null,tab:'login'};
const requests=new Set();
const dateFormatter=new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Bangkok'});
const passwordFields=['player-login-password','player-register-password','player-register-confirm','player-current-password','player-new-password','player-confirm-password','player-revoke-password'];
const errorIds=['player-login-error','player-register-error','player-password-error','player-revoke-error','player-profile-error','player-config-error'];
function text(id,value){$(id).textContent=value===undefined||value===null?'—':String(value);}
function clearError(id){text(id,'');$(id).hidden=true;}
function showError(id,error){text(id,error instanceof Error?error.message:String(error));$(id).hidden=false;}
function flash(message,isError=false){text('player-flash',message);$('player-flash').hidden=!message;$('player-flash').classList.toggle('error',isError);}
function clearPasswords(){passwordFields.forEach(id=>{$(id).value='';});}
function normalizeBase(value){
  let url;try{url=new URL(value.trim());}catch{throw new Error('กรอก URL API ให้ครบ เช่น https://arena-api.example.com');}
  if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)))throw new Error('API ต้องใช้ HTTPS หรือ HTTP เฉพาะ localhost สำหรับทดสอบ');
  if(url.username||url.password||url.search||url.hash)throw new Error('URL API ต้องไม่มีรหัสผ่าน ข้อความค้นหา หรือ #');
  return url.origin+url.pathname.replace(/\/+$/,'').replace(/\/api\/v1$/,'');
}
function switchTab(tab){
  state.tab=tab;
  for(const name of ['login','register']){const selected=name===tab;const button=$('player-'+name+'-tab');button.classList.toggle('selected',selected);button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;$('player-'+name+'-panel').hidden=!selected;}
  clearPasswords();
}
function setBusy(busy){
  state.busy=busy;
  document.querySelectorAll('form button,form input,.player-auth-tabs button').forEach(node=>{node.disabled=busy;});
  $('player-logout-button').disabled=busy;$('player-refresh-button').disabled=busy||state.refreshing;
  $('player-register-button').disabled=busy||state.config?.registrationEnabled!==true;
}
function passwordPolicy(){return {min:state.config?.passwordMinLength??15,max:state.config?.passwordMaxLength??128};}
function checkPassword(password){const {min,max}=passwordPolicy();const length=Array.from(password).length;if(length<min||length>max)throw new Error('รหัสผ่านต้องมี '+min+'–'+max+' ตัวอักษร โดยนับอักขระ Unicode');}
function checkUsername(value){const name=value.trim();if(!/^[A-Za-z0-9_.-]{3,32}$/.test(name))throw new Error('ชื่อผู้ใช้ต้องมี 3–32 ตัวอักษร ใช้ A–Z, a–z, 0–9, _ . - เท่านั้น');return name.toLowerCase();}
function stamp(value){if(!value)return '—';const date=new Date(value);return Number.isNaN(date.getTime())?'—':dateFormatter.format(date);}
async function api(path,{method='GET',body,auth=true,timeout=20000}={}){
  if(auth&&!state.token)throw new Error('กรุณาเข้าสู่ระบบผู้เล่นอีกครั้ง');
  const session=state.session,controller=new AbortController();requests.add(controller);const timer=setTimeout(()=>controller.abort(),timeout);
  try{
    const response=await fetch(state.apiBase+'/api/v1'+path,{method,credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal,headers:{Accept:'application/json',...(body===undefined?{}:{'Content-Type':'application/json'}),...(auth?{Authorization:'Bearer '+state.token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    let data=null;if(response.status!==204){if(!(response.headers.get('content-type')||'').includes('application/json'))throw new Error('เซิร์ฟเวอร์ตอบรูปแบบที่ไม่รองรับ (HTTP '+response.status+')');data=await response.json();}
    if(session!==state.session)throw new Error('เซสชันนี้สิ้นสุดแล้ว');
    if(!response.ok){
      const error=data?.error,code=typeof error==='object'?error?.code:null;
      const message=typeof error==='string'?error:error?.message||'คำขอไม่สำเร็จ (HTTP '+response.status+')';
      if(auth&&(response.status===401||['PLAYER_SUSPENDED','PLAYER_DISABLED','PLAYER_ACCOUNT_SUSPENDED'].includes(code)))endSession('เซสชันสิ้นสุดหรือบัญชีถูกระงับ กรุณาเข้าสู่ระบบอีกครั้ง',true);
      throw new Error(message+(code?' ['+code+']':''));
    }
    return data;
  }catch(error){
    if(error.name==='AbortError')throw new Error('การเชื่อมต่อหมดเวลาหรือเซสชันสิ้นสุด กรุณาลองอีกครั้ง หากสมัครไว้แล้วให้ลองเข้าสู่ระบบ');
    if(error instanceof TypeError)throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ต HTTPS และปลายทาง API');
    throw error;
  }finally{clearTimeout(timer);requests.delete(controller);}
}
function endSession(message='',isError=false){
  state.token=null;state.player=null;state.expiresAt=null;state.session+=1;clearTimeout(state.expiryTimer);state.expiryTimer=null;
  requests.forEach(controller=>controller.abort());requests.clear();clearPasswords();errorIds.forEach(clearError);
  $('player-profile').replaceChildren();text('player-profile-name','บัญชีผู้เล่น');$('player-account-view').hidden=true;$('player-auth-view').hidden=false;switchTab('login');flash(message,isError);
}
function applySession(data){
  if(typeof data?.token!=='string'||!data.token||!data.player?.id)throw new Error('เซิร์ฟเวอร์ตอบข้อมูลเซสชันไม่ครบ กรุณาลองเข้าสู่ระบบอีกครั้ง');
  state.token=data.token;state.player=data.player;state.expiresAt=data.expiresAt;state.session+=1;clearTimeout(state.expiryTimer);
  const expiry=new Date(data.expiresAt).getTime()-Date.now();if(Number.isFinite(expiry))state.expiryTimer=setTimeout(()=>endSession('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง',true),Math.max(0,Math.min(expiry,2147483647)));
  clearPasswords();errorIds.forEach(clearError);$('player-auth-view').hidden=true;$('player-account-view').hidden=false;renderProfile();window.scrollTo(0,0);
}
function renderProfile(){
  const player=state.player;if(!player)return;
  text('player-profile-name',player.displayName||player.username);
  const entries=[['ชื่อผู้ใช้',player.username],['ชื่อที่แสดง',player.displayName||'—'],['สถานะ',player.status==='active'?'ใช้งานได้':player.status==='suspended'?'ระงับบัญชี':player.status],['รหัสผู้เล่น',player.id],['สมัครเมื่อ',stamp(player.createdAt)],['เซสชันหมดอายุ',stamp(state.expiresAt)]];
  $('player-profile').replaceChildren(...entries.map(([caption,value])=>{const node=document.createElement('div');node.className='detail-item';const label=document.createElement('span');label.textContent=caption;const content=document.createElement('strong');content.textContent=value===null||value===undefined?'—':String(value);node.append(label,content);return node;}));
}
async function loadConfig(event){
  event?.preventDefault();if(state.busy||state.token)return;clearError('player-config-error');const epoch=++state.configEpoch;state.config=null;setBusy(true);text('player-registration-status','กำลังตรวจสถานะการสมัคร…');
  try{
    state.apiBase=normalizeBase($('player-api-url').value);const config=await api('/player/auth/config',{auth:false});if(epoch!==state.configEpoch)return;
    if(typeof config?.registrationEnabled!=='boolean')throw new Error('ข้อมูลสถานะรับสมัครจาก API ไม่ครบ');state.config=config;
    text('player-registration-status',config.registrationEnabled?'เปิดรับสมัครบัญชีผู้เล่น':'ขณะนี้ปิดรับสมัคร · บัญชีเดิมเข้าสู่ระบบได้');$('player-registration-status').classList.toggle('closed',!config.registrationEnabled);
    const {min,max}=passwordPolicy();document.querySelectorAll('.player-password-policy').forEach(node=>{node.textContent='ใช้ '+min+'–'+max+' ตัวอักษร โดยนับอักขระ Unicode รหัสผ่านใหม่ต้องต่างจากรหัสเดิม';});
  }catch(error){showError('player-config-error',error);text('player-registration-status','ยังตรวจสถานะสมัครไม่ได้ · กดตรวจการเชื่อมต่อเพื่อลองใหม่');$('player-registration-status').classList.add('closed');}
  finally{if(epoch===state.configEpoch)setBusy(false);}
}
async function authenticate(event,register){
  event.preventDefault();if(state.busy)return;const prefix=register?'player-register':'player-login';clearError(prefix+'-error');flash('');setBusy(true);
  try{
    state.apiBase=normalizeBase($('player-api-url').value);const username=checkUsername($(prefix+'-username').value),password=$(prefix+'-password').value;const body={username,password};
    if(register){
      if(state.config?.registrationEnabled!==true)throw new Error('ยังไม่เปิดรับสมัคร หรือยังตรวจสถานะสมัครไม่ได้');checkPassword(password);
      if(password!==$('player-register-confirm').value)throw new Error('รหัสผ่านและช่องยืนยันไม่ตรงกัน');
      const displayName=$('player-register-display-name').value.trim();if(displayName){if(Array.from(displayName).length>48)throw new Error('ชื่อที่แสดงต้องมี 1–48 ตัวอักษร');body.displayName=displayName;}
    }else if(!password||Array.from(password).length>128)throw new Error('กรอกรหัสผ่านให้ครบ โดยไม่เกิน 128 ตัวอักษร');
    const result=await api('/player/auth/'+(register?'register':'login'),{method:'POST',auth:false,body});applySession(result);flash(register?'สมัครและเข้าสู่ระบบสำเร็จแล้ว':'เข้าสู่ระบบสำเร็จแล้ว');
  }catch(error){showError(prefix+'-error',error);}finally{clearPasswords();setBusy(false);}
}
async function refreshProfile(){
  if(!state.token||state.refreshing||state.busy)return;state.refreshing=true;$('player-refresh-button').disabled=true;clearError('player-profile-error');
  try{const data=await api('/player/me');if(!data?.player?.id)throw new Error('เซิร์ฟเวอร์ตอบข้อมูลบัญชีไม่ครบ');state.player=data.player;state.expiresAt=data.expiresAt||state.expiresAt;renderProfile();}
  catch(error){if(state.token)showError('player-profile-error',error);else flash(error.message,true);}finally{state.refreshing=false;$('player-refresh-button').disabled=state.busy;}
}
async function logout(){
  if(state.busy||!state.token)return;setBusy(true);let message='ออกจากระบบแล้ว',failed=false;
  try{await api('/player/auth/logout',{method:'POST',body:{},timeout:8000});}
  catch(error){message='ปิดเซสชันบนหน้าแล้ว แต่ยืนยันการออกจากระบบบนเซิร์ฟเวอร์ไม่ได้: '+error.message;failed=true;}
  finally{endSession(message,failed);setBusy(false);}
}
async function changePassword(event){
  event.preventDefault();if(state.busy)return;clearError('player-password-error');setBusy(true);
  try{
    const currentPassword=$('player-current-password').value,newPassword=$('player-new-password').value;checkPassword(newPassword);
    if(newPassword!==$('player-confirm-password').value)throw new Error('รหัสผ่านใหม่และช่องยืนยันไม่ตรงกัน');if(currentPassword===newPassword)throw new Error('รหัสผ่านใหม่ต้องต่างจากรหัสเดิม');
    await api('/player/auth/password',{method:'POST',body:{currentPassword,newPassword}});endSession('เปลี่ยนรหัสผ่านและยกเลิกทุกเซสชันแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่');
  }catch(error){if(state.token)showError('player-password-error',error);else flash(error.message,true);}finally{clearPasswords();setBusy(false);}
}
async function revokeSessions(event){
  event.preventDefault();if(state.busy)return;clearError('player-revoke-error');setBusy(true);
  try{await api('/player/auth/revoke-sessions',{method:'POST',body:{currentPassword:$('player-revoke-password').value}});endSession('ยกเลิกทุกเซสชันแล้ว กรุณาเข้าสู่ระบบอีกครั้ง');}
  catch(error){if(state.token)showError('player-revoke-error',error);else flash(error.message,true);}finally{clearPasswords();setBusy(false);}
}

$('player-api-url').value=API_BASE;
$('player-api-form').addEventListener('submit',loadConfig);
$('player-login-form').addEventListener('submit',event=>authenticate(event,false));
$('player-register-form').addEventListener('submit',event=>authenticate(event,true));
$('player-password-form').addEventListener('submit',changePassword);
$('player-revoke-form').addEventListener('submit',revokeSessions);
$('player-logout-button').addEventListener('click',logout);
$('player-refresh-button').addEventListener('click',refreshProfile);
for(const tab of ['login','register']){
  $('player-'+tab+'-tab').addEventListener('click',()=>switchTab(tab));
  $('player-'+tab+'-tab').addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?'login':event.key==='End'?'register':tab==='login'?'register':'login';switchTab(next);$('player-'+next+'-tab').focus();}});
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.token)refreshProfile();});
window.addEventListener('pagehide',()=>endSession());
loadConfig();
