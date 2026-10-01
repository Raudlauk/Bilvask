'use client';
import {useEffect,useState} from 'react';
import {useLanguage} from './language';
type User={id:string;username:string;active:number};
export function UserManager(){
  const {t}=useLanguage();
  const [users,setUsers]=useState<User[]>([]),[username,setUsername]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState('');
  const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();setError('');
    fetch('/api/users',{signal:controller.signal}).then(async r=>{const b=await r.json() as {users:User[];error?:string};if(!r.ok)throw new Error(b.error);setUsers(b.users);setReady(true)}).catch(e=>{if(!controller.signal.aborted)setError(e.message)});
    return()=>controller.abort();
  },[retry]);
  async function save(body:Record<string,unknown>){
    setBusy(true);setError('');setNotice('');
    try{
      const r=await fetch('/api/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const b=await r.json() as {error?:string};if(!r.ok)throw new Error(b.error);
      if(body.action==='create'){setUsername('');setPassword('');setConfirm('');setNotice('Brukeren er opprettet med kun lesetilgang.');}
      else if(body.action==='delete'){setUsers(current=>current.filter(user=>user.id!==body.id));setNotice('Brukeren er slettet.');}
      else setNotice('Tilgangen er oppdatert. Brukeren må logge inn på nytt.');
      setRetry(n=>n+1);
    }catch(e){setError(e instanceof Error?e.message:'Kunne ikke lagre brukeren.')}finally{setBusy(false)}
  }
  return <section className="panel user-manager"><h2>{t('Brukere med lesetilgang')}</h2>
    <p className="muted">{t('Disse brukerne kan se arbeidslisten, men kan ikke avbestille bilvasker eller endre innstillinger.')}</p>
    {!ready&&!error&&<p role="status">{t('Laster…')}</p>}
    {ready&&<><form onSubmit={e=>{e.preventDefault();if(password!==confirm){setError('De nye passordene er ikke like.');return}void save({action:'create',username,password})}}>
      <div className="form-grid user-create-fields"><label>{t('Brukernavn')}<input required minLength={2} maxLength={50} autoComplete="off" aria-describedby="username-help" value={username} disabled={busy} onChange={e=>setUsername(e.target.value)}/><small id="username-help" className="field-help">{t('2–50 tegn. Bruk bokstaver, tall eller disse symbolene:')}<span className="allowed-symbols"><code>.</code><code>_</code><code>@</code><code>-</code></span></small></label>
      <label>{t('Passord')}<input type="password" required minLength={8} maxLength={200} autoComplete="new-password" aria-describedby="password-help" value={password} disabled={busy} onChange={e=>setPassword(e.target.value)}/><small id="password-help" className="field-help">{t('8–200 tegn.')}</small></label>
      <label>{t('Bekreft passord')}<input type="password" required minLength={8} maxLength={200} autoComplete="new-password" aria-describedby="confirm-password-help" value={confirm} disabled={busy} onChange={e=>setConfirm(e.target.value)}/><small id="confirm-password-help" className="field-help">{t('Skriv inn det samme passordet på nytt.')}</small></label></div>
      <button className="primary" disabled={busy}>{t(busy?'Lagrer…':'Opprett bruker')}</button>
    </form>
    {users.length?<ul className="closed-date-list">{users.map(user=><li key={user.id}><span><strong>{user.username}</strong> · {t(user.active?'Aktiv':'Deaktivert')} · {t('Kun lesetilgang')}</span><div className="user-actions"><button className="secondary" disabled={busy} onClick={()=>void save({action:'access',id:user.id,active:!user.active})} aria-label={t(user.active?'Deaktiver':'Aktiver')+': '+user.username}>{t(user.active?'Deaktiver':'Aktiver')}</button><button type="button" className="secondary delete-user" disabled={busy} aria-label={t('Slett bruker')+': '+user.username} onClick={()=>{if(window.confirm(t('Slette denne brukeren? Tilgangen fjernes umiddelbart.')+'\n\n'+user.username))void save({action:'delete',id:user.id})}}>{t('Slett bruker')}</button></div></li>)}</ul>:<p className="muted">{t('Ingen brukere med lesetilgang ennå.')}</p>}</>}
    {error&&<p className="error" role="alert">{t(error)} {!ready&&<button className="secondary" onClick={()=>setRetry(n=>n+1)}>{t('Prøv igjen.')}</button>}</p>}
    {notice&&<p className="success" role="status">{t(notice)}</p>}
  </section>;
}
