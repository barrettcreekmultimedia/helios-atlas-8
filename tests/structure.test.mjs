import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
test('PlayCanvas Engine module and game entrypoint',()=>{
 const html=read('index.html');assert.match(html,/playcanvas@2\.23\.3/);assert.match(html,/src\/main\.js/);
 for(const name of ['main','world','combat','rules','graphics'])assert.ok(existsSync(new URL(`src/${name}.js`,root)));
});
test('every interactive HUD control has a handler',()=>{
 const html=read('index.html'),js=read('src/main.js');
 const ids=[...html.matchAll(/<button\b[^>]*\bid="([\w-]+)"/g)].map(x=>x[1]);
 assert.ok(ids.length>=11);
 for(const id of ids)assert.ok(js.includes(`$('${id}')`)||['p1-mode','p1-next','p2-mode','p2-next'].includes(id),`missing handler for ${id}`);
});
test('surface textures are local fallbacks and no science progression modules remain',()=>{
 assert.ok(readdirSync(new URL('assets/',root)).filter(f=>f.endsWith('.jpg')).length>=20);
 assert.ok(!existsSync(new URL('src/progression.js',root)));
 assert.match(read('src/world.js'),/debris/);
 assert.match(read('src/combat.js'),/last|winner|findWinner/);
});
