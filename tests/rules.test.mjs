import test from 'node:test';
import assert from 'node:assert/strict';
import {SHIP_CLASSES,assignTeams,segmentSphere,applyDamage,findWinner,calculatePlanetDamage,lcg} from '../src/rules.js';

test('three distinguishable ship classes with weapon stats',()=>{
 assert.deepEqual(Object.keys(SHIP_CLASSES),['interceptor','fighter','dreadnought']);
 assert.ok(SHIP_CLASSES.interceptor.maxSpeed>SHIP_CLASSES.fighter.maxSpeed);
 assert.ok(SHIP_CLASSES.dreadnought.hp>SHIP_CLASSES.fighter.hp);
 assert.ok(SHIP_CLASSES.dreadnought.missileDamage>SHIP_CLASSES.fighter.missileDamage);
});
test('2 human players plus bots on consistent co-op teams',()=>{
 const teams=assignTeams('teams',2);assert.equal(teams.length,4);
 assert.deepEqual(teams.map(t=>t.human),[true,true,false,false]);
 assert.deepEqual(teams.map(t=>t.team),[0,0,1,1]);
});
test('one human + bot ally supported',()=>{
 const t=assignTeams('teams',1);assert.deepEqual(t.map(x=>x.human),[true,false,false,false]);
 assert.deepEqual(t.map(x=>x.team),[0,0,1,1]);
});
test('FFA has four separate teams and no friendly fire allies',()=>{
 const t=assignTeams('ffa',2);assert.deepEqual(t.map(x=>x.team),[0,1,2,3]);
});
test('swept sphere collision detects tunneling and avoids misses',()=>{
 const p=(x,y,z)=>({x,y,z});
 assert.ok(Math.abs(segmentSphere(p(-10,0,0),p(10,0,0),p(0,0,0),2)-.4)<1e-7);
 assert.equal(segmentSphere(p(-10,5,0),p(10,5,0),p(0,0,0),2),null);
 assert.equal(segmentSphere(p(0,0,0),p(10,0,0),p(0,0,0),2),0);
});
test('shields absorb damage before hull',()=>{
 const s={hp:100,shields:30};const p=applyDamage(s,45);
 assert.equal(p.absorbed,30);assert.equal(p.dealt,15);assert.equal(s.hp,85);
 assert.equal(applyDamage(s,200).killed,true);assert.equal(s.hp,0);
});
test('last team standing and last pilot standing',()=>{
 assert.equal(findWinner([{hp:100,team:0},{hp:50,team:1}]),null);
 assert.deepEqual(findWinner([{hp:100,team:0},{hp:0,team:1},{hp:20,team:0}]),{team:0,survivors:2});
 assert.deepEqual(findWinner([{hp:0,team:0},{hp:0,team:1}]),{team:-1,survivors:0});
});
test('missiles deal more structural damage to planets',()=>{
 assert.ok(calculatePlanetDamage('missile',50)>calculatePlanetDamage('laser',50));
});
test('deterministic seeded random supports consistent asteroid placement',()=>{
 const a=lcg(432),b=lcg(432);assert.deepEqual(Array.from({length:8},a),Array.from({length:8},b));
});
