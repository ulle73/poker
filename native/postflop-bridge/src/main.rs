//! Native transport adapter for the pinned, unmodified MIT Postflop engine.
//! JSON conventions follow upstream wasm/src/lib.rs (Wes Sander, 2026).
//! No CFR, best-response, evaluation or betting algorithm is implemented here.
use engine::{br::{self, StrategyProfile}, cards, cfr::{DcfrParams, Solver},
    config::SolveConfig, game::Game, nlhe::NlheGame,
    tree::{Action, ActionLabel, GameTree, NodeKind, Terminal, NO_CHILD}};
use serde_json::{json, Value};
use std::{io::Write, time::Instant};

struct Profile<'a>(&'a Solver<NlheGame>);
impl StrategyProfile for Profile<'_> {
    fn strategy_into(&self, node:u32, out:&mut [f32]) { self.0.average_strategy_into(node,out); }
}

fn action_json(tree:&GameTree, id:u32, p:u8, actions:&[Action], action:&Action)->Value {
    let n=tree.node(id);
    let (label,to)=match action.label {
        ActionLabel::Fold=>("fold",None), ActionLabel::Check=>("check",None),
        ActionLabel::Call=>("call",None), ActionLabel::AllIn=>("allin",None),
        ActionLabel::Bet(x)=>("bet",Some(x)), ActionLabel::Raise(x)=>("raise",Some(x)),
    };
    let pct=match action.label {
        ActionLabel::Bet(x)=>Some(100.0*x/n.pot),
        ActionLabel::Raise(_)=>actions.iter().find(|a|matches!(a.label,ActionLabel::Call)).map(|call|{
            let post=tree.node(call.child).pot;
            let added=n.stacks[p as usize]-tree.node(action.child).stacks[p as usize];
            100.0*(added-(post-n.pot))/post
        }),
        _=>None,
    };
    json!({"label":label,"text":label,"amount_to":to,"percent_of_pot":pct,"child":action.child})
}

fn run()->Result<(),String> {
    let started=Instant::now();
    let args:Vec<String>=std::env::args().collect();
    if args.len()!=4 { return Err("Usage: bridge input.toml line.json output.json".into()); }
    let cfg=SolveConfig::from_toml_str(&std::fs::read_to_string(&args[1]).map_err(|e|e.to_string())?)?;
    if ![4,5].contains(&cfg.board_cards()?.len()) || cfg.rake.percent!=0.0 ||
        cfg.tournament.is_some() || !cfg.locks.is_empty() || cfg.turn_chance_sampling ||
        cfg.raise_cap!=1 || cfg.max_iterations>2000 || cfg.max_iterations<100 ||
        !(0.01..=2.0).contains(&cfg.target_exploitability) {
        return Err("Unsupported native live model".into());
    }
    let threads=std::env::var("POKER_NATIVE_THREADS").ok().and_then(|s|s.parse::<usize>().ok()).unwrap_or(4);
    if !(1..=8).contains(&threads) {return Err("Invalid native thread count".into());}
    rayon::ThreadPoolBuilder::new().num_threads(threads).build_global().map_err(|e|e.to_string())?;
    let game=NlheGame::new(&cfg)?;
    let tree=game.tree();
    let mut entries=0usize;
    for id in 0..tree.len() as u32 {
        if let NodeKind::Decision{player,actions}=&tree.node(id).kind {
            entries+=actions.len()*game.live_combos(id,*player).len();
        }
    }
    let memory=entries*8+game.chance_map_bytes();
    // Separate limits for native graph export and actual CFR storage. No array
    // allocation occurs before these checks; the browser's old 5000-node cap
    // is not a native memory estimate.
    if tree.len()>10000 || memory>64*1024*1024 {return Err("Native model exceeds 64 MiB / 10000 public nodes".into());}
    let line:Vec<String>=serde_json::from_str(&std::fs::read_to_string(&args[2]).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?;
    if line.len()>2 {return Err("Unsupported decision line".into());}
    let params=DcfrParams::from_config(&cfg);
    let mut solver=Solver::new(game);
    let setup_ms=started.elapsed().as_secs_f64()*1000.0;
    let mut cfr_ms=0.0; let mut quality_ms=0.0;
    let mut pct=f32::INFINITY;
    while solver.iterations()<cfg.max_iterations {
        let chunk=25.min(cfg.max_iterations-solver.iterations());
        let phase=Instant::now();
        solver.run(chunk,&params,0,|_,_,_|{});
        cfr_ms+=phase.elapsed().as_secs_f64()*1000.0;
        let phase=Instant::now();
        let report=solver.exploitability();pct=report.pct_of_pot;
        quality_ms+=phase.elapsed().as_secs_f64()*1000.0;
        eprintln!("{}",json!({"iterations":solver.iterations(),"chips":report.chips,"pct":pct}));
        if (pct as f64)<=cfg.target_exploitability {break;}
    }
    if !pct.is_finite() || pct<0.0 || pct as f64>cfg.target_exploitability {
        return Err(format!("Solution error {pct:.3}% exceeds {:.3}%",cfg.target_exploitability));
    }
    let game=solver.game(); let tree=game.tree(); let profile=Profile(&solver);
    let mut selected=game.root();
    let mut reaches=[game.root_weights(0).to_vec(),game.root_weights(1).to_vec()];
    for step in &line {
        let NodeKind::Decision{player,actions}=&tree.node(selected).kind else {return Err("Line crosses nondecision".into())};
        let (label,size)=step.split_once(':').map_or((step.as_str(),None),|(a,b)|(a,b.parse::<f64>().ok()));
        let index=actions.iter().position(|a|{
            let v=action_json(tree,selected,*player,actions,a);
            v["label"]==label && size.map_or(true,|x|v["percent_of_pot"].as_f64().is_some_and(|y|(x-y).abs()<1e-6))
        }).ok_or("Selected line absent from native tree")?;
        let sigma=solver.average_strategy(selected); let len=reaches[*player as usize].len();
        for h in 0..len { reaches[*player as usize][h]*=sigma[index*len+h]; }
        selected=actions[index].child;
    }
    let NodeKind::Decision{player,actions}=&tree.node(selected).kind else {return Err("Selected node is not a decision".into())};
    let p=*player; let count=game.live_combos(selected,p).len();
    let opp=&reaches[(1-p) as usize];
    let mass=game.compatible_mass(selected,p,opp);
    let value_at=|id|{
        let mut values=vec![0.0f32;count];
        br::subtree_values(game,id,p,&profile,opp,false,&mut values);
        values.iter().zip(&mass).map(|(v,m)|if *m>0.0 {Some(*v / *m)}else{None}).collect::<Vec<_>>()
    };
    let evs=value_at(selected);
    let action_evs:Vec<_>=actions.iter().map(|a|value_at(a.child)).collect();
    let sigma=solver.average_strategy(selected);
    let hands:Vec<_>=game.live_combos(selected,p).iter().enumerate().map(|(i,&(a,b))|json!({
        "cards":format!("{}{}",cards::card_to_string(a),cards::card_to_string(b)),
        "weight":reaches[p as usize][i],"compatibleMass":mass[i],"ev":evs[i],
        "frequencies":(0..actions.len()).map(|j|sigma[j*count+i]).collect::<Vec<_>>(),
        "actionEvs":action_evs.iter().map(|v|v[i]).collect::<Vec<_>>()
    })).collect();
    let nodes:Vec<_>=(0..tree.len() as u32).map(|id|{
        let n=tree.node(id);
        let mut v=json!({"id":id,"street":n.street,"board":game.board_at(id).iter().map(|&c|cards::card_to_string(c)).collect::<Vec<_>>(),
            "pot":n.pot,"stacks":n.stacks,"actions":[],"hands":[]});
        match &n.kind {
            NodeKind::Decision{player,actions}=>{
                v["kind"]=json!("decision");v["player"]=json!(player);
                v["actions"]=json!(actions.iter().map(|a|action_json(tree,id,*player,actions,a)).collect::<Vec<_>>());
                if id==selected {v["hands"]=json!(hands);}
            },
            NodeKind::Chance{child_for_card,..}=>{
                v["kind"]=json!("chance");
                v["valid_cards"]=json!(child_for_card.iter().enumerate().filter(|(_,c)|**c!=NO_CHILD)
                    .map(|(c,&child)|json!({"card":cards::card_to_string(c as u8),"child":child})).collect::<Vec<_>>());
            },
            NodeKind::Terminal(t)=>{
                v["kind"]=json!("terminal");v["terminal"]=match t {
                    Terminal::Fold{folder,pot}=>json!({"kind":"fold","folder":folder,"pot":pot}),
                    Terminal::Showdown{pot}=>json!({"kind":"showdown","pot":pot}),
                };
            },
        } v
    }).collect();
    let root_ranges:Vec<_>=(0..2u8).map(|p|game.live_combos(0,p).iter().zip(game.root_weights(p)).map(|(&(a,b),w)|
        json!({"cards":format!("{}{}",cards::card_to_string(a),cards::card_to_string(b)),"weight":w})).collect::<Vec<_>>()).collect();
    let ev=[solver.expected_value(0),solver.expected_value(1)];
    let answer=json!({"backend":"native","meta":{"iterations":solver.iterations(),"exploitability_chips":pct*cfg.starting_pot as f32/100.0,
        "exploitability_pct_of_pot":pct,"root_evs":{"zero_sum":ev,"pot_share":ev.map(|x|x+cfg.starting_pot as f32/2.0)},"node_count":tree.len()},
        "nodes":nodes,"rootRanges":root_ranges,"selectedNodeId":selected,"memoryBytes":memory,"wallMs":started.elapsed().as_secs_f64()*1000.0,
        "timings":{"setupMs":setup_ms,"cfrMs":cfr_ms,"qualityMs":quality_ms,"exportMs":started.elapsed().as_secs_f64()*1000.0-setup_ms-cfr_ms-quality_ms},"threads":threads});
    let output=std::fs::File::create(&args[3]).map_err(|e|e.to_string())?;
    serde_json::to_writer(std::io::BufWriter::new(output),&answer).map_err(|e|e.to_string())?;
    Ok(())
}
fn main(){if let Err(error)=run(){let _=writeln!(std::io::stderr(),"{error}");std::process::exit(1);}}
