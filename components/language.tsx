'use client';
import {createContext,useContext,useEffect,useRef,useState} from 'react';
import translations from '@/lib/translations.json';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
type Language='nb'|'en';
const Context=createContext({language:'nb' as Language,setLanguage:(_:Language)=>{},t:(text:string)=>text});
const defaultTitle='Steam - Bestill bilvask';
// Page titles come from route metadata ("<page> - Steam"); only the page part is translated.
function englishTitle(title:string){if(title===defaultTitle)return 'Steam - Book your car wash';const page=title.match(/^(.*) - Steam$/)?.[1];return page?((translations as Record<string,string>)[page]??page)+' - Steam':title}
export function LanguageProvider({children}:{children:React.ReactNode}){
 const [language,setLanguage]=useState<Language>('nb');
 const pageTitle=useRef('');
 useEffect(()=>{try{const saved=localStorage.getItem('steam-language');if(saved==='en')setLanguage('en')}catch{}},[]);
 useEffect(()=>{pageTitle.current||=document.title||defaultTitle;document.documentElement.lang=language;document.title=language==='nb'?pageTitle.current:englishTitle(pageTitle.current)},[language]);
 function change(value:Language){setLanguage(value);try{localStorage.setItem('steam-language',value)}catch{}}
 const t=(text:string)=>language==='en'?((translations as Record<string,string>)[text.replace(/\s+/g,' ').trim()]??text):text;
 return <Context.Provider value={{language,setLanguage:change,t}}>{children}</Context.Provider>
}
export function useLanguage(){return useContext(Context)}
export function LanguagePicker(){const {language,setLanguage}=useLanguage();return <Select value={language} onValueChange={value=>{if(value==='nb'||value==='en')setLanguage(value)}}><SelectTrigger className="language-picker" aria-label="Språk / Language"><SelectValue>{language==='nb'?'Norsk':'English'}</SelectValue></SelectTrigger><SelectContent className="language-menu"><SelectItem value="nb">Norsk bokmål</SelectItem><SelectItem value="en">English</SelectItem></SelectContent></Select>}
