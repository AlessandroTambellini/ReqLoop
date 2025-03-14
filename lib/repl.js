const repl = require('node:repl');
const { get_copy_of_checks_map, write_checks_to_disk } = require('./data');

// TOADD in the future: https://nodejs.org/docs/latest/api/repl.html#replserversetuphistoryhistorypath-callback

/*
I think having a REPL to show and filter the checks, without opening the web interface, could be handy.
*/

function eval_cmd(cmd, context, filename, callback) 
{    
    cmd = cmd.substring(0, cmd.length -1).toLowerCase(); // remove '\n' 
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
            console.log('No option provided. Type \'check --help\' for available options.');
        }
    } else if (tokens[0] === '--help') {
        console.log('.help\tBuilt-in help command. Show this list of special commands\n' +
        'check\tget info about the checks');
    } else {
        console.log('Invalid command. Type \'--help\' for available commands.');
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
            console.log('There is no check with the specified id.');
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
        console.log('Invalid option. Type \'check --help\' for available options.');
    }
}

function init_main_REPL() {
    let repl_server = repl.start({ prompt: '', eval: eval_cmd });
    console.log('[INFO] REPL started. Type \'--help\' for available commands.');
    
    repl_server.on('exit', async () => {
        console.log('[INFO] REPL closed.');
        /* Workers save data to disk once per minute. 
        So, if the process is killed after changes are made but before the next scheduled save, 
        those changes would be lost. 
        How can this be avoided? 
        When the user closes the main REPL, 
        it may be a sign that wants to terminate the application, 
        and so, all pending changes are written to disk. */
        await write_checks_to_disk();
        init_secondary_REPL();
    });
}

function init_secondary_REPL() 
{    
    const eval_open_main_REPL = (cmd, context, filename, callback) => {
        cmd = cmd.substring(0, cmd.length -1).toLowerCase(); // remove '\n'
        // and trim it
        const tokens = cmd.split(' ').filter(token => {
            if (token !== '') return token;
        });
        
        if (tokens[0] === 'open' && tokens[1] === 'repl') {
            callback(null);
            f_open_main_repl = true;
            repl_listener.close();
        }
        
        callback(null);
    }
    
    let f_open_main_repl = false;
    let repl_listener = repl.start({ prompt: '', eval: eval_open_main_REPL });

    repl_listener.on('exit', () => {
        if (f_open_main_repl) {
            f_open_main_repl = false;
            init_main_REPL();
        }
    });
}

module.exports = { init_main_REPL };
