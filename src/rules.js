// Pure, independently testable rules. Visual rendering and keyboard input are separate.
export const SHIP_CLASSES={
  interceptor:{name:'SPECTRE',role:'Interceptor',tag:'FAST // FRAGILE',hp:95,shields:70,acceleration:22,turn:2.55,maxSpeed:65,laserDamage:11,laserDelay:.125,missileDamage:39,missileDelay:2.2,radius:.48,color:'#73def9'},
  fighter:{name:'VANGUARD',role:'Assault',tag:'BALANCED // DEADLY',hp:145,shields:100,acceleration:17,turn:1.9,maxSpeed:51,laserDamage:17,laserDelay:.19,missileDamage:51,missileDelay:2.75,radius:.62,color:'#f2c18a'},
  dreadnought:{name:'TITAN',role:'Dreadnought',tag:'HEAVY // POWERFUL',hp:235,shields:135,acceleration:11.5,turn:1.32,maxSpeed:40,laserDamage:24,laserDelay:.275,missileDamage:68,missileDelay:3.25,radius:.84,color:'#c3a6ff'}
};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const lcg=seed=>{let s=seed>>>0;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;}};
export function segmentSphere(start,end,center,radius){
 const dx=end.x-start.x,dy=end.y-start.y,dz=end.z-start.z;
 const fx=start.x-center.x,fy=start.y-center.y,fz=start.z-center.z;
 const a=dx*dx+dy*dy+dz*dz;
 if(a<1e-12)return fx*fx+fy*fy+fz*fz<=radius*radius?0:null;
 const b=2*(fx*dx+fy*dy+fz*dz),c=fx*fx+fy*fy+fz*fz-radius*radius;
 if(c<=0)return 0;
 const delta=b*b-4*a*c;if(delta<0)return null;
 const t=(-b-Math.sqrt(delta))/(2*a);return t>=0&&t<=1?t:null;
}
export function assignTeams(mode,humanCount=2){
 const count=clamp(Math.floor(humanCount),1,2);
 return Array.from({length:4},(_,i)=>({slot:i,human:i<count,team:mode==='teams'?(i<2?0:1):i}));
}
export function applyDamage(state,amount){
 if(!state||state.hp<=0)return {absorbed:0,dealt:0,killed:false};
 const shield=Math.min(Math.max(0,state.shields||0),amount);
 state.shields=Math.max(0,(state.shields||0)-shield);
 const dealt=Math.max(0,amount-shield);
 state.hp=Math.max(0,state.hp-dealt);
 return {absorbed:shield,dealt,killed:state.hp===0};
}
export function findWinner(ships){
 const alive=ships.filter(s=>s.hp>0);
 const teams=new Set(alive.map(s=>s.team));
 if(!alive.length)return {team:-1,survivors:0};
 if(teams.size!==1)return null;
 return {team:alive[0].team,survivors:alive.length};
}
export function calculatePlanetDamage(type,amount){
 return amount*(type==='missile'?2.45:1.6);
}
export function travelTime(distance,speed){return speed>0?distance/speed:Infinity;}
