'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import translations from '@/lib/translations.json';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
type Language='nb'|'en';
const Context=createContext({language:'nb' as Language,setLanguage:(_:Language)=>{},t:(text:string)=>text});
export function LanguageProvider({children}:{children:React.ReactNode}){
 const [language,setLanguage]=useState<Language>('nb');
 useEffect(()=>{try{const saved=localStorage.getItem('steam-language');if(saved==='en')setLanguage('en')}catch{}},[]);
 useEffect(()=>{document.documentElement.lang=language;document.title=language==='nb'?'Steam — Bestill bilvask':'Steam — Book your car wash'},[language]);
 function change(value:Language){setLanguage(value);try{localStorage.setItem('steam-language',value)}catch{}}
 const t=(text:string)=>language==='en'?((translations as Record<string,string>)[text.replace(/\s+/g,' ').trim()]??text):text;
 return <Context.Provider value={{language,setLanguage:change,t}}>{children}</Context.Provider>
}
export function useLanguage(){return useContext(Context)}
export function LanguagePicker(){const {language,setLanguage}=useLanguage();return <Select value={language} onValueChange={value=>{if(value==='nb'||value==='en')setLanguage(value)}}><SelectTrigger className="language-picker" aria-label="Språk / Language"><SelectValue>{language==='nb'?'Norsk':'English'}</SelectValue></SelectTrigger><SelectContent className="language-menu"><SelectItem value="nb">Norsk bokmål</SelectItem><SelectItem value="en">English</SelectItem></SelectContent></Select>}
