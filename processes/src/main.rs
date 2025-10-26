use std::{ collections::HashMap, env, io::Write, os::unix::net::UnixStream, process::ExitCode };

use regex::Regex;

#[derive(serde::Serialize)]
struct Response<'a> {
    request_id: &'a str,
    data: HashMap<&'a str, &'a str>,
}

/// Args must be given as for example: cargo run -- --arg=1
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
    // Request id is always present
    if filtered_args.len() <= 1 {
        panic!("No arguments given!");
    }

    let mut request_id: Option<&str> = None;

    filtered_args.iter().for_each(|arg| {
        let prefix_removed = arg.strip_prefix("--").unwrap();
        let equality_index = prefix_removed.find("=");
        match equality_index {
            Some(i) => {
                let (key, value) = prefix_removed.split_at(i);
                let parsed_value = value.strip_prefix("=").unwrap();
                if key == "request_id" {
                    request_id = Some(parsed_value);
                } else {
                    argmap.insert(key, parsed_value);
                }
            }
            None => {
                panic!("Invalid arg: {}", arg);
            }
        }
    });

    println!("Args were: {:?}", argmap);
    match request_id {
        Some(id) => {
            let socket = UnixStream::connect("/tmp/eventController");
            if socket.is_ok() {
                println!("Responding to event controller");
                let response = Response {
                    request_id: id,
                    data: argmap,
                };
                let json = serde_json::to_string(&response).unwrap();
                socket.unwrap().write(json.as_bytes()).unwrap();
            } else {
                panic!("Connection failed: {socket:?}");
            }
        }
        None => {
            panic!("Missing request id!");
        }
    }
    println!("Finished execution for argparse");
    Ok(())
}
