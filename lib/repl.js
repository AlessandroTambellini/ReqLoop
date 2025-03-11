const repl = require('node:repl');
const { get_copy_of_checks_map } = require('./data');

// TOADD in the future: https://nodejs.org/docs/latest/api/repl.html#replserversetuphistoryhistorypath-callback

/*
I think having a REPL to show the checks and filter them may be useful
to debug or simply to look at them without opening the web interface.
*/

function eval_cmd(cmd, context, filename, callback) 
{    
    cmd = cmd.substring(0, cmd.length -1); // remove '\n' 
    // and trim it
    const tokens = cmd.split(' ').filter(token => {
        if (token !== '') return token;
    });
    
    if (tokens.length === 0) {
        callback(null);
        return;
    }

    if (tokens[0] === 'check') {
        let checks_map = get_copy_of_checks_map();
        const options = tokens.slice(1, tokens.length);
        if (options.length > 0) {
            eval_check_cmd(options, checks_map)
        } else {
            console.log('No option provided. Type "check --help" for available options.');
        }
    } else if (tokens[0] === '--help') {
        console.log('.help\tBuilt-in help command. Show this list of special commands\n' +
        'check\tget info about the checks');
    } else {
        console.log('Invalid command. Type --help for available commands.');
    }

    callback(null);
}

function eval_check_cmd(options, checks_map) 
{
    const filter_checks = (err_code = false, quantity = checks_map.size) => {
        let checks_obj = Object.fromEntries(checks_map);
        let i = 0;
        for (const [key, value] of Object.entries(checks_obj)) {
            if (i < quantity && !err_code) {
                console.log(`"${key}": ${JSON.stringify(value, undefined, 4)}`);
                i++;
            }
            else if (i < quantity && err_code) {
                if (value.err_code) {
                    console.log(`"${key}": ${JSON.stringify(value, undefined, 4)}`);
                    i++;
                }
            }
        }
    };

    /*
    Only -n and --err-code can be used toghether to perform some sort of filtering.
    The other flags are 'static'.
    */
    
    let curr_option = options[0].trim();
    let next_option = options[1]?.trim();

    if (curr_option === '--help') {
        console.log('' + 
            '--all\t\tShow all the checks\n' + 
            '-n=<num>\tShow the first <num> checks\n' +
            '-id=<id>\tShow check with specified id.\n' +
            '--err-code\tShow just the checks with the err_code prop set to a value');
    }
    else if (curr_option === '--all') {        
        filter_checks();
    }
    else if (curr_option.startsWith('-id=')) {
        const check_id = curr_option.split('-id=')[1];
        if (checks_map.has(check_id)) {
            console.log(`"${check_id}": ${JSON.stringify(checks_map.get(check_id), undefined, 4)}`);
        } else {
            console.log('No check with the specified id.');
        }
    }
    else if (curr_option.startsWith('-n=')) {
        let quantity = Number(curr_option.split('-n=')[1]);
        if (quantity) {
            if (next_option === '--err-code') {
                filter_checks(true, quantity);
            } else {
                filter_checks(false, quantity);
            }
        } else {
            console.log('Invalid quantity specified.');
        }
    }
    else if (curr_option === '--err-code') {
        if (next_option?.startsWith('-n=')) {
            let quantity = Number(next_option.split('-n=')[1]);
            if (quantity) {
                filter_checks(true, quantity);
            } else {
                console.log('Invalid quantity specified.');
            }
        } else {
            filter_checks(true);
        }
    }
    else {
        console.log('Invalid option. Type "check --help" for available options.');
    }
}

function init_REPL_server() {
    repl.start({ prompt: '', eval: eval_cmd });
    console.log('REPL started. Type --help for available commands.');
}

module.exports = { init_REPL_server };
