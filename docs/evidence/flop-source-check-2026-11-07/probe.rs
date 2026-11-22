use postflop_solver::*;
use std::time::Instant;
use serde_json::json;
fn cap(tree:&mut ActionTree,mut raises:u8,mut bet:i32){
 if tree.is_terminal_node(){return;}
 if tree.is_chance_node(){raises=0;bet=0;}
 for a in tree.available_actions().to_vec(){
  let raising=matches!(a,Action::Raise(_)|Action::AllIn(_))&&bet>0;
  if raising&&raises>=1{tree.remove_action(a).unwrap();continue;}
  let next=match a{Action::Bet(x)|Action::Raise(x)|Action::AllIn(x)=>x,_=>bet};
  tree.play(a).unwrap();cap(tree,raises+u8::from(raising),next);tree.undo().unwrap();
 }
}
fn main(){
 let started=Instant::now();
 rayon::ThreadPoolBuilder::new().num_threads(4).build_global().unwrap();
 let full=std::iter::once("22+".to_string()).chain("3456789TJQKA".chars().flat_map(|r|[format!("{r}2s+"),format!("{r}2o+")])).collect::<Vec<_>>().join(",");
 let args:Vec<String>=std::env::args().collect();
 let narrow=args.iter().any(|v|v=="--narrow");
 let cards=CardConfig{range:if narrow{["99,AA".parse().unwrap(),"22,KK".parse().unwrap()]}else{[full.parse().unwrap(),full.parse().unwrap()]},flop:flop_from_str("JhQhKh").unwrap(),turn:NOT_DEALT,river:NOT_DEALT};
 let sizes=BetSizeOptions::try_from(("50%, a","50%, a")).unwrap();
 let compact=args.iter().any(|v|v=="--compact");
 let continuation=if compact{BetSizeOptions::try_from(("a","a")).unwrap()}else{sizes.clone()};
 let mut tree=ActionTree::new(TreeConfig{initial_state:BoardState::Flop,starting_pot:10,effective_stack:200,
  flop_bet_sizes:[sizes.clone(),sizes],turn_bet_sizes:[continuation.clone(),continuation.clone()],river_bet_sizes:[continuation.clone(),continuation],
  turn_donk_sizes:Some(Default::default()),river_donk_sizes:Some(Default::default()),add_allin_threshold:0.0,force_allin_threshold:0.0,merging_threshold:0.0,..Default::default()}).unwrap();
 cap(&mut tree,0,0);tree.back_to_root();
 let mut game=PostFlopGame::with_config(cards,tree).unwrap();
 let mem=game.memory_usage().0;
 println!("{}",json!({"phase":"setup","memoryBytes":mem,"elapsedMs":started.elapsed().as_millis(),"narrow":narrow,"compact":compact,"maxRaises":1}));
 if mem>1024*1024*1024{println!("{}",json!({"rejected":"over 1 GiB test budget"}));return;}
 game.allocate_memory(false);
 for i in 0..100 {
  solve_step(&game,i);
  if (i+1)%10==0{let pct=200.0*compute_exploitability(&game)/10.0;println!("{}",json!({"iterations":i+1,"pctOfPot":pct,"elapsedMs":started.elapsed().as_millis()}));if pct<=2.0 {return;}}
  if started.elapsed().as_secs()>30{println!("{}",json!({"stopped":"30s probe budget"}));return;}
 }
}
