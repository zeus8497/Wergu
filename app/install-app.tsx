"use client";
import {useEffect,useState} from "react";
import {Download,Check} from "lucide-react";

type PromptEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:"accepted"|"dismissed"}>};
export function PwaBootstrap(){
 useEffect(()=>{
  if(!('serviceWorker' in navigator))return;
  let active=true;
  navigator.serviceWorker.register('/sw.js').then(async registration=>{
   await navigator.serviceWorker.ready;
   if(!active)return;
   const assets=performance.getEntriesByType('resource').map(r=>r.name).filter(url=>url.startsWith(location.origin));
   (registration.active||navigator.serviceWorker.controller)?.postMessage({type:'CACHE_ASSETS',urls:assets});
  }).catch(()=>{});
  return()=>{active=false};
 },[]);
 return null;
}
export function InstallApp(){
 const [prompt,setPrompt]=useState<PromptEvent|null>(null);
 const [installed,setInstalled]=useState(false);
 useEffect(()=>{
  const onPrompt=(e:Event)=>{e.preventDefault();setPrompt(e as PromptEvent)};
  const onInstalled=()=>{setInstalled(true);setPrompt(null)};
  window.addEventListener('beforeinstallprompt',onPrompt);
  window.addEventListener('appinstalled',onInstalled);
  setInstalled(window.matchMedia('(display-mode: standalone)').matches);
  return()=>{window.removeEventListener('beforeinstallprompt',onPrompt);window.removeEventListener('appinstalled',onInstalled)};
 },[]);
 const install=async()=>{if(!prompt)return;await prompt.prompt();const result=await prompt.userChoice;if(result.outcome==='accepted')setInstalled(true);setPrompt(null)};
 return <div className="panel v-install"><span className="eyebrow">SUR TON TÉLÉPHONE ANDROID</span><h3>Installer Saliou THIAW · Évolution</h3><p>Le portrait de Saliou s’ajoute à l’écran d’accueil. L’application s’ouvre sans barre de navigateur et conserve le journal sur ce téléphone.</p>{installed?<div className="v-install-status"><Check size={18}/> Application installée sur cet appareil</div>:prompt?<button className="button-primary" onClick={install}><Download size={17}/> Installer l’application</button>:<p className="v-install-steps">Dans Chrome sur le Tecno : ouvre le menu ⋮, puis touche « Installer l’application » ou « Ajouter à l’écran d’accueil ».</p>}<p className="v-muted">Une connexion est nécessaire pour la première ouverture et les mises à jour. Exporte régulièrement tes données : elles ne se synchronisent pas encore entre appareils.</p></div>
}
