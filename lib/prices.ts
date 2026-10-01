export type Prices={inside:number|null;outside:number|null;fluid:number|null};
export const emptyPrices:Prices={inside:null,outside:null,fluid:null};
export function washTotal(prices:Prices,inside:boolean,outside:boolean,fluid=false){if((inside&&prices.inside==null)||(outside&&prices.outside==null)||(fluid&&prices.fluid==null))return null;return (inside?(prices.inside||0):0)+(outside?(prices.outside||0):0)+(fluid?(prices.fluid||0):0)}
export function money(amount:number,language:'nb'|'en'){return new Intl.NumberFormat(language==='nb'?'nb-NO':'en-GB',{style:'currency',currency:'NOK'}).format(amount/100)}

export function withPolish(total:number|null,polish:boolean,price:number|null){return total===null||(polish&&price===null)?null:total+(polish?(price??0):0)}
export function servicePrice(price:number,largeCar:boolean,percent:number){return largeCar?Math.round(price*(100+percent)/100):price}
export function bookingTotal(prices:Prices,inside:boolean,outside:boolean,fluid:boolean,polish:boolean,polishPrice:number|null,largeCar:boolean,percent:number){
  const adjusted={...prices,inside:prices.inside===null?null:servicePrice(prices.inside,largeCar,percent),outside:prices.outside===null?null:servicePrice(prices.outside,largeCar,percent)};
  return withPolish(washTotal(adjusted,inside,outside,fluid),polish,polishPrice===null?null:servicePrice(polishPrice,largeCar,percent));
}
