use std::{ collections::HashMap, env, process::ExitCode };

use regex::Regex;

fn main() -> Result<(), ExitCode> {
    let args: Vec<String> = env::args().collect();
    let mut argmap: HashMap<&str, &str> = HashMap::new();
    let arg_regex = Regex::new(r"^[-]{2}.+[=]{1}.+").unwrap();
    let filtered_args: Vec<&String> = args
        .iter()
        .filter(|arg| {
            return arg_regex.is_match(arg);
        })
        .collect();
    if filtered_args.len() == 0 {
        panic!("No arguments given!");
    }
    filtered_args.iter().for_each(|arg| {
        let prefix_removed = arg.strip_prefix("--").unwrap();
        let equality_index = prefix_removed.find("=");
        match equality_index {
            Some(i) => {
                let (key, value) = prefix_removed.split_at(i);
                argmap.insert(key, value.strip_prefix("=").unwrap());
            }
            None => {
                panic!("Invalid arg: {}", arg);
            }
        }
    });
    print!("Args were: {:?}", argmap);
    Ok(())
}
