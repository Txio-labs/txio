use colored::*;

pub fn print_logo() {
    let logo = r#"
    _____ _                
   |  ___| | _____      __
   | |_  | |/ _ \ \ /\ / /
   |  _| | | (_) \ V  V / 
   |_|   |_|\___/ \_/\_/  
    "#;
    println!("{}", logo.cyan().bold());
    println!(
        "{} v{}\n",
        "Universal Multi-Chain Terminal".dimmed(),
        env!("CARGO_PKG_VERSION")
    );
}

pub fn print_success(msg: &str) {
    println!("{} {}", "✔".green().bold(), msg);
}

pub fn print_error(msg: &str) {
    eprintln!("{} {}", "✖".red().bold(), msg);
}
