// Planetary cartography manifest. Real 2K maps are CC BY 4.0 from Solar System Scope
// (via the explicitly credited Sanghel solar-system-3d mirror). Low-resolution local
// original maps remain fallbacks where an online map is unavailable.
const mirror='https://cdn.jsdelivr.net/gh/Sanghel/solar-system-3d@develop/public/textures/';
const raw='https://raw.githubusercontent.com/Sanghel/solar-system-3d/develop/public/textures/';
const primary=['sun','mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'];
const moons=['moon','io','europa','ganymede','callisto','titan','triton'];
const sourcePath=(id)=>primary.includes(id)?`${id}.jpg`:moons.includes(id)?`satellites/${id}.jpg`:null;
export function textureCandidates(id){
 const path=sourcePath(id);
 return [
  `assets/real/${id}.jpg`,
  ...(path?[mirror+path,raw+path]:[]),
  `assets/${id}.jpg`
 ];
}
export const cartographyStatus=(id,url)=>{
 if(!sourcePath(id))return 'ARTISTIC RECONSTRUCTION • GLOBAL PHOTO MAP NOT AVAILABLE';
 if(!url)return 'LOADING CARTOGRAPHIC MAP / 2K';
 return url.startsWith('assets/')&&!url.includes('/real/')?'ORIGINAL ARTWORK FALLBACK • REAL MAP DID NOT LOAD':'REAL CARTOGRAPHY COMPOSITE • 2K SOURCE / CC BY 4.0';
};
// The supplied remote sources use Creative Commons Attribution 4.0.
// https://solarsystemscope.com/textures/ — https://creativecommons.org/licenses/by/4.0/
