export type Prices={inside:number|null;outside:number|null};
export const emptyPrices:Prices={inside:null,outside:null};
export function washTotal(prices:Prices,inside:boolean,outside:boolean){if((inside&&prices.inside===null)||(outside&&prices.outside===null))return null;return (inside?(prices.inside||0):0)+(outside?(prices.outside||0):0)}
export function money(amount:number,language:'nb'|'en'){return new Intl.NumberFormat(language==='nb'?'nb-NO':'en-GB',{style:'currency',currency:'NOK'}).format(amount/100)}
