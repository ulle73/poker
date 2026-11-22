// SPDX-License-Identifier: AGPL-3.0-or-later
//! Transport and model adapter for b-inary/postflop-solver. Solver algorithms
//! are supplied by that library. Currency is converted to integer cents.
use postflop_solver::*;
use serde::Deserialize;
use serde_json::{json, Value};
use std::{collections::HashSet, io::Write, time::Instant};

#[derive(Deserialize)]
#[serde(rename_all="camelCase",deny_unknown_fields)]
struct Config {
    board:Vec<String>, oop_range:String, ip_range:String, pot:f64, stack:f64,
    bet_sizes:Vec<f64>, raise_sizes:Vec<f64>, max_iterations:u32, target_pct:f64,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Hand {cards:String,weight:f32}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Request {config:Config,ranges:[Vec<Hand>;2]}

fn cents(v:f64)->Result<i32,String>{
    let n=(v*100.0).round();
    if !v.is_finite()||n<1.0||n>100000.0||(n-v*100.0).abs()>1e-6 {return Err("Invalid integer-cent amount".into());}
    Ok(n as i32)
}
fn money(v:i32)->f64{v as f64/100.0}
fn card(s:&str)->Result<Card,String>{card_from_str(s).map_err(|e|e.to_string())}
fn hole(h:(Card,Card))->String{format!("{}{}",card_to_string(h.0).unwrap(),card_to_string(h.1).unwrap())}
fn range(hands:&[Hand],board:&[Card])->Result<Range,String>{
    if hands.is_empty()||hands.len()>1326{return Err("Invalid range size".into());}
    let mut seen=HashSet::new();let mut pairs=Vec::new();let mut weights=Vec::new();
    for h in hands {
        if h.cards.len()!=4||!h.weight.is_finite()||h.weight<=0.0||h.weight>1.0{return Err("Invalid range hand".into());}
        let a=card(&h.cards[..2])?;let b=card(&h.cards[2..])?;let pair=(a.min(b),a.max(b));
        if a==b||board.contains(&a)||board.contains(&b)||!seen.insert(pair){return Err("Duplicate or blocked range hand".into());}
        pairs.push(pair);weights.push(h.weight);
    }
    Range::from_hands_weights(&pairs,&weights)
}
fn sizes(bet:&[f64],raise:&[f64])->Result<BetSizeOptions,String>{
    let table=|v:&[f64]|->Result<String,String>{
        if v.is_empty()||v.len()>3||v.iter().any(|n|!n.is_finite()||*n<10.0||*n>200.0){return Err("Invalid sizing table".into());}
        Ok(v.iter().map(|n|format!("{n}%")).chain(std::iter::once("a".into())).collect::<Vec<_>>().join(","))
    };
    BetSizeOptions::try_from((table(bet)?.as_str(),table(raise)?.as_str()))
}
/// Keep the same one-raise-per-street model as the existing live provider,
/// including all-in raises. This is tree construction, not policy pruning.
fn cap_raises(tree:&mut ActionTree,mut raises:u8,mut bet:i32)->Result<(),String>{
    if tree.is_terminal_node(){return Ok(());}
    if tree.is_chance_node(){raises=0;bet=0;}
    for a in tree.available_actions().to_vec(){
        let raising=matches!(a,Action::Raise(_)|Action::AllIn(_))&&bet>0;
        if raising&&raises>=1 {tree.remove_action(a)?;continue;}
        let next=match a{Action::Bet(x)|Action::Raise(x)|Action::AllIn(x)=>x,_=>bet};
        tree.play(a)?;let result=cap_raises(tree,raises+u8::from(raising),next);tree.undo()?;result?;
    }
    Ok(())
}
fn tree(cfg:&Config)->Result<ActionTree,String>{
    let s=sizes(&cfg.bet_sizes,&cfg.raise_sizes)?;
    let mut t=ActionTree::new(TreeConfig{initial_state:if cfg.board.len()==4{BoardState::Turn}else{BoardState::River},
        starting_pot:cents(cfg.pot)?,effective_stack:cents(cfg.stack)?,
        turn_bet_sizes:[s.clone(),s.clone()],river_bet_sizes:[s.clone(),s],
        turn_donk_sizes:Some(Default::default()),river_donk_sizes:Some(Default::default()),
        add_allin_threshold:0.0,force_allin_threshold:0.0,merging_threshold:0.0,..Default::default()})?;
    cap_raises(&mut t,0,0)?;t.back_to_root();Ok(t)
}
fn action(a:Action,p:usize,paid:[i32;2],base:[i32;2],pot:i32)->Value{
    let own=paid[p]-base[p];let current=(paid[0]-base[0]).max(paid[1]-base[1]);
    let (label,to,pct)=match a{
        Action::Check=>("check",None,None),Action::Fold=>("fold",None,None),
        Action::Call=>("call",None,None),Action::AllIn(_)=>("allin",None,None),
        Action::Bet(x)=>("bet",Some(money(x)),Some(100.0*x as f64/pot as f64)),
        Action::Raise(x)=>("raise",Some(money(x)),Some(100.0*(x-current) as f64/(pot+current-own) as f64)),
        _=>unreachable!(),
    };
    json!({"label":label,"text":label,"amount_to":to,"percent_of_pot":pct,"child":0})
}
fn selected(tree:&mut ActionTree,cfg:&Config,line:&[String])->Result<Vec<Action>,String>{
    if line.len()>2{return Err("Unsupported line".into());}
    let mut p=0;
    for token in line {
        let paid=tree.total_bet_amount();let pot=cents(cfg.pot)?+paid.iter().sum::<i32>();
        let (label,size)=match token.split_once(':'){
            Some((label,n))=>{let x:f64=n.parse().map_err(|_|"Invalid line sizing")?;if !x.is_finite(){return Err("Invalid line sizing".into());}(label,Some(x))},
            None=>(token.as_str(),None),
        };
        let a=tree.available_actions().iter().find(|&&a|{
            let v=action(a,p,paid,[0,0],pot);
            v["label"]==label&&size.map_or(true,|n|v["percent_of_pot"].as_f64().is_some_and(|x|(x-n).abs()<1e-6))
        }).copied().ok_or("Observed line absent from model")?;
        tree.play(a)?;p^=1;
    }
    let result=tree.history().to_vec();tree.back_to_root();Ok(result)
}

struct Export<'a>{game:&'a mut PostFlopGame,tree:ActionTree,cfg:&'a Config,nodes:Vec<Value>,
    selected:Vec<Action>,selected_id:Option<usize>,all:bool,pot:i32,stack:i32}
impl Export<'_>{
    fn leaf(&mut self,board:&[String],paid:[i32;2],folder:Option<usize>)->usize{
        let id=self.nodes.len();let matched=paid[0].min(paid[1]);
        self.nodes.push(json!({"id":id,"kind":"terminal","street":"river","board":board,"actions":[],"hands":[],
            "pot":money(self.pot+2*matched),"stacks":[money(self.stack-matched),money(self.stack-matched)],
            "terminal":if let Some(p)=folder{json!({"kind":"fold","folder":p,"pot":money(self.pot+2*matched)})}
                else{json!({"kind":"showdown","pot":money(self.pot+2*matched)})}}));id
    }
    fn hands(&mut self,board:&[String],p:usize,actions:&[Action],path:Option<&[usize]>,paid:[i32;2])->Result<Vec<Value>,String>{
        let cards=self.game.private_cards(p).to_vec();
        let dead:Vec<_>=board.iter().map(|s|card(s)).collect::<Result<_,_>>()?;
        if let Some(path)=path{
            self.game.apply_history(path);
            if self.game.is_terminal_node()||self.game.is_chance_node()||self.game.current_player()!=p||self.game.available_actions()!=actions{return Err("Policy/public tree mismatch".into());}
            self.game.cache_normalized_weights();
            let weights=self.game.weights(p);let norm=self.game.normalized_weights(p);
            let sigma=self.game.strategy();let ev=self.game.expected_values(p);let evs=self.game.expected_values_detail(p);
            let offset=(self.pot as f32/2.0+paid[p] as f32)/100.0;
            let n=cards.len();
            Ok(cards.iter().enumerate().filter(|(_,h)|!dead.contains(&h.0)&&!dead.contains(&h.1)).map(|(i,&h)|{
                let mass=if weights[i]>0.0{norm[i]/weights[i]}else{0.0};
                json!({"cards":hole(h),"weight":weights[i],"compatibleMass":mass,
                    "frequencies":(0..actions.len()).map(|a|sigma[a*n+i]).collect::<Vec<_>>(),
                    "ev":if mass>0.0{Some(ev[i]/100.0-offset)}else{None},
                    "actionEvs":(0..actions.len()).map(|a|if mass>0.0{Some(evs[a*n+i]/100.0-offset)}else{None}).collect::<Vec<_>>()})
            }).collect())
        }else{
            // No joint hand in the requested ranges can reach this runout.
            // Any legal normalized policy is equivalent there; no advice uses it.
            Ok(cards.iter().filter(|h|!dead.contains(&h.0)&&!dead.contains(&h.1)).map(|&h|json!({"cards":hole(h),"weight":0,
                "compatibleMass":0,"ev":null,"actionEvs":vec![Value::Null;actions.len()],"frequencies":vec![1.0/actions.len() as f64;actions.len()]})).collect())
        }
    }
    fn walk(&mut self,board:Vec<String>,p:usize,base:[i32;2],folder:Option<usize>,path:Option<Vec<usize>>)->Result<usize,String>{
        if self.nodes.len()>10000{return Err("Public export budget exceeded".into());}
        let paid=self.tree.total_bet_amount();let terminal=self.tree.is_terminal_node();let pot=self.pot+paid.iter().sum::<i32>();
        if folder.is_none()&&board.len()==4&&(terminal||self.tree.is_chance_node()){
            let id=self.nodes.len();self.nodes.push(json!({"id":id,"kind":"chance","street":"turn","board":board,
                "pot":money(pot),"stacks":paid.map(|v|money(self.stack-v)),"actions":[],"hands":[]}));
            let possible=if self.all&&!terminal{if let Some(ref path)=path{self.game.apply_history(path);self.game.possible_cards()}else{0}}else{0};
            let mut edges=Vec::new();
            for c in 0..52u8{
                let text=card_to_string(c).unwrap();if board.contains(&text){continue;}
                let mut next=board.clone();next.push(text.clone());
                let child=if terminal{self.leaf(&next,paid,None)}else{
                    let next_path=if possible&(1u64<<c)!=0{path.as_ref().map(|v|{let mut x=v.clone();x.push(c as usize);x})}else{None};
                    self.walk(next,0,paid,None,next_path)?
                };
                edges.push(json!({"card":text,"child":child}));
            }
            self.nodes[id]["valid_cards"]=json!(edges);return Ok(id);
        }
        if terminal{return Ok(self.leaf(&board,paid,folder));}
        let id=self.nodes.len();let actions=self.tree.available_actions().to_vec();
        let chosen=board==self.cfg.board&&self.tree.history()==self.selected;
        let hands=if self.all||chosen{self.hands(&board,p,&actions,path.as_deref(),paid)?}else{Vec::new()};
        if chosen{self.selected_id=Some(id);}
        self.nodes.push(json!({"id":id,"kind":"decision","player":p,"street":if board.len()==4{"turn"}else{"river"},
            "board":board,"pot":money(pot),"stacks":paid.map(|v|money(self.stack-v)),"actions":[],"hands":hands}));
        let mut out=Vec::new();
        for (index,&a) in actions.iter().enumerate(){
            let mut v=action(a,p,paid,base,pot);
            let next_path=path.as_ref().map(|v|{let mut x=v.clone();x.push(index);x});
            self.tree.play(a)?;
            let child=self.walk(board.clone(),p^1,base,if a==Action::Fold{Some(p)}else{None},next_path);
            self.tree.undo()?;v["child"]=json!(child?);out.push(v);
        }
        self.nodes[id]["actions"]=json!(out);Ok(id)
    }
}

fn run()->Result<(),String>{
    let start=Instant::now();let args:Vec<String>=std::env::args().collect();
    if args.len()!=4&&!(args.len()==5&&args[4]=="--audit-all"){return Err("Usage: bridge input.json line.json output.json [--audit-all]".into());}
    let Request{config:cfg,ranges}=serde_json::from_slice::<Request>(&std::fs::read(&args[1]).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?;
    if ![4,5].contains(&cfg.board.len())||cfg.board.iter().collect::<HashSet<_>>().len()!=cfg.board.len()||
        !(100..=2000).contains(&cfg.max_iterations)||!cfg.target_pct.is_finite()||!(0.01..=2.0).contains(&cfg.target_pct)||
        cfg.oop_range.len()>512||cfg.ip_range.len()>512{return Err("Unsupported model".into());}
    let all=args.len()==5;if all&&ranges.iter().map(Vec::len).sum::<usize>()>64{return Err("Full audit export only supports small ranges".into());}
    let board:Vec<_>=cfg.board.iter().map(|s|card(s)).collect::<Result<_,_>>()?;
    let cards=CardConfig{range:[range(&ranges[0],&board)?,range(&ranges[1],&board)?],flop:[board[0],board[1],board[2]],
        turn:board[3],river:if board.len()==5{board[4]}else{NOT_DEALT}};
    rayon::ThreadPoolBuilder::new().num_threads(4).build_global().map_err(|e|e.to_string())?;
    let mut game=PostFlopGame::with_config(cards,tree(&cfg)?)?;
    let memory=game.memory_usage().0;
    if memory>64*1024*1024{return Err("Native solver memory budget exceeded".into());}
    game.allocate_memory(false);
    let setup_ms=start.elapsed().as_secs_f64()*1000.0;let mut done=0;
    let mut canonical_pct=f32::INFINITY;let mut cfr_ms=0.0;let mut quality_ms=0.0;
    for i in 0..cfg.max_iterations{
        let phase=Instant::now();solve_step(&game,i);cfr_ms+=phase.elapsed().as_secs_f64()*1000.0;done=i+1;
        if done%10==0||done==cfg.max_iterations{
            let phase=Instant::now();canonical_pct=200.0*compute_exploitability(&game)/cents(cfg.pot)? as f32;
            quality_ms+=phase.elapsed().as_secs_f64()*1000.0;
            eprintln!("{}",json!({"iterations":done,"pct":canonical_pct}));
            if canonical_pct as f64<=cfg.target_pct{break;}
        }
    }
    if !canonical_pct.is_finite()||canonical_pct<0.0||canonical_pct as f64>cfg.target_pct{return Err(format!("Solution error {canonical_pct:.3}% exceeds {}%",cfg.target_pct));}
    let export_start=Instant::now();finalize(&mut game);
    // Vendor metric is the mean of both BR values. Canonical app metric is
    // their SUM / starting pot. Recheck the finalized profile, never relabel
    // the vendor's 1% mean as 1% NashConv.
    canonical_pct=200.0*compute_exploitability(&game)/cents(cfg.pot)? as f32;
    if !canonical_pct.is_finite()||canonical_pct<0.0||canonical_pct as f64>cfg.target_pct{return Err("Finalized profile failed quality bound".into());}
    let ev=compute_current_ev(&game).map(|v|v/100.0);
    game.back_to_root();
    let root_ranges:Vec<_>=(0..2).map(|p|game.private_cards(p).iter().zip(game.weights(p)).map(|(&h,w)|json!({"cards":hole(h),"weight":w})).collect::<Vec<_>>()).collect();
    let mut public_tree=tree(&cfg)?;
    let line:Vec<String>=serde_json::from_slice(&std::fs::read(&args[2]).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?;
    let chosen=selected(&mut public_tree,&cfg,&line)?;
    let mut export=Export{game:&mut game,tree:public_tree,cfg:&cfg,nodes:Vec::new(),selected:chosen,selected_id:None,all,pot:cents(cfg.pot)?,stack:cents(cfg.stack)?};
    export.walk(cfg.board.clone(),0,[0,0],None,Some(Vec::new()))?;
    let selected_id=export.selected_id.ok_or("Selected decision was not exported")?;
    let answer=json!({"backend":"native","engine":"b-inary","meta":{"iterations":done,"exploitability_pct_of_pot":canonical_pct,
        "exploitability_chips":canonical_pct as f64*cfg.pot/100.0,"node_count":export.nodes.len(),
        "root_evs":{"zero_sum":ev,"pot_share":ev.map(|x|x+cfg.pot as f32/2.0)}},"nodes":export.nodes,"selectedNodeId":selected_id,
        "rootRanges":root_ranges,"memoryBytes":memory,"wallMs":start.elapsed().as_secs_f64()*1000.0,
        "timings":{"setupMs":setup_ms,"cfrMs":cfr_ms,"qualityMs":quality_ms,"exportMs":export_start.elapsed().as_secs_f64()*1000.0}});
    let mut file=std::io::BufWriter::new(std::fs::File::create(&args[3]).map_err(|e|e.to_string())?);
    serde_json::to_writer(&mut file,&answer).map_err(|e|e.to_string())?;file.flush().map_err(|e|e.to_string())?;Ok(())
}
fn main(){if let Err(error)=run(){eprintln!("{error}");std::process::exit(1);}}
