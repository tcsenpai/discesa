// Bot that plays every tunnel with the game's own physics (extracted from index.html
// between the LOGIC-START / LOGIC-END markers). Checks that every generated level can be completed.
// Usage: bun test/bot.js   (or: node test/bot.js)
const fs=require('fs');
const src=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const logic=src.split('/*LOGIC-START*/')[1].split('/*LOGIC-END*/')[0];
const api=new Function(logic+';return {genLevel,newState,step,LEVELS,Hs,Sl,obsU,W,R};')();
const {genLevel,newState,step,LEVELS,obsU}=api;
function run(idx,verbose){
  const L=genLevel(idx), st=newState(L), dt=1/120; let lane=0;
  const inp={steer:0,target:0,jump:false};
  for(let n=0;n<120*400;n++){
    const v=st.v, look=v*0.8;
    const near=L.obs.filter(o=>o.s+o.d/2>st.s-0.5&&o.s-o.d/2<st.s+look);
    const hi=near.filter(o=>o.type==='laser'&&o.base>1.2);
    const tall=o=>o.type==='block'||(o.type==='spike'&&hi.some(h=>Math.abs(h.s-o.s)<3));
    const cands=near.some(o=>o.move)?[-3.6,-3.275,-1.6,0,1.6,3.275,3.6]:[-3.275,0,3.275];
    let best=null,bestD=-1e9; const blk={};
    for(const u of cands){ let dmin=1e9;
      for(const o of near){ if(!tall(o))continue; const ta=Math.max(0,(o.s-o.d/2-st.s)/v); const ou=obsU(o,st.t+ta);
        if(Math.abs(u-ou)<o.w/2+(o.move?1.2:0.75)){ dmin=Math.min(dmin,o.s-o.d/2-st.s); } }
      blk[u]=dmin; const sc=dmin-Math.abs(u-st.u)*0.3; if(sc>bestD){bestD=sc;best=u;} }
    if(blk[lane]===1e9)best=lane;
    lane=best; inp.target=lane;
    // jump?
    let jump=false; const noJump=hi.some(h=>h.s-st.s<v*0.7&&h.s-st.s>-1)||L.pads.some(q=>q.s-st.s>-1.5&&q.s-st.s<v*0.66);
    if(!noJump){
      for(const o of near){ if(tall(o))continue; if(o.type==='laser'&&o.base>1.2)continue;
        if(Math.abs(st.u-o.u)>o.w/2+0.8&&Math.abs(lane-o.u)>o.w/2+0.8)continue;
        const f=o.s-o.d/2-st.s; if(f>-0.2&&f<=0.056*v+1.0)jump=true; }
      for(const g of L.gaps){ const f=g[0]-st.s; if(f>-0.2&&f<=0.1*v+0.4)jump=true; }
    }
    inp.jump=jump;
    step(L,st,inp,dt);
    if(st.dead){ if(verbose)console.log('  died at s=',st.s.toFixed(1),'ev',st.ev.join(),'u',st.u.toFixed(2),'near',JSON.stringify(L.obs.filter(o=>Math.abs(o.s-st.s)<8).map(o=>[o.type,o.s.toFixed(1),o.u,o.d,o.base])),'gaps',JSON.stringify(L.gaps.filter(g=>Math.abs(g[0]-st.s)<40)),'pads',JSON.stringify(L.pads.filter(q=>Math.abs(q.s-st.s)<40)), 'slope',api.Sl(L,st.s).toFixed(2),'v',st.v.toFixed(1)); return {ok:false,s:st.s,L}; }
    if(st.won)return {ok:true,t:st.t,L};
  }
  return {ok:false,s:st.s,L};
}
let failed=0;
for(let i=0;i<LEVELS.length;i++){ const r=run(i,true);
  console.log((r.ok?'ok   ':'FAIL ')+(i+1)+' '+LEVELS[i].name+(r.ok?' — cleared in '+r.t.toFixed(1)+'s':' — died at '+(r.s/r.L.len*100).toFixed(0)+'%'));
  if(!r.ok)failed++; }
// custom track: the same level config the game derives from a song (seed, speed, length, beat grid)
const C=LEVELS[LEVELS.length-1];
for(const [seed,bpm,dur] of [[11,72,95],[2024,96,180],[777,128,240],[31337,150,200],[4242,174,300],[99,200,120]]){
  C.seed=seed; C.speed=Math.round(Math.min(32,Math.max(22,22+(bpm-110)*.2))); C.len=Math.round(Math.min(6000,Math.max(400,dur*C.speed*1.08)));
  C.beatS=C.speed*60/bpm; while(C.beatS<10)C.beatS*=2;
  const r=run(LEVELS.length-1,true);
  console.log((r.ok?"ok   ":"FAIL ")+"track "+bpm+" BPM, "+dur+"s"+(r.ok?" — cleared in "+r.t.toFixed(1)+"s":" — died at "+(r.s/r.L.len*100).toFixed(0)+"%"));
  if(!r.ok)failed++; }
process.exit(failed?1:0);
