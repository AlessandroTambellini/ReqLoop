const http = require('node:http');
const https = require('node:https');
const { get_all_checks, update_check, write_checks_to_disk } = require('./data');
const util = require('node:util');
const debuglog = util.debuglog('workers');

function perform_check(check_id, check_obj) 
{
    const parsed_url = new URL(`${check_obj.protocol}://${check_obj.url}`);

    const check_outcome = {
        'status_code': null,
        'error': null
    };

    const req_options = {
        'protocol' : check_obj.protocol + ':',
        'hostname' : parsed_url.hostname,
        'method' : check_obj.method,
        'path' : parsed_url.pathname + parsed_url.search,
        'timeout' : check_obj.timeout_seconds * 1000
    };
    
    const module_to_use = check_obj.protocol === 'http' ? http : https;
    const req = module_to_use.request(req_options);
    
    let outcome_sent = false;

    req.on('response', (res) => {        
        if (!outcome_sent) {
            outcome_sent = true;
            check_outcome.status_code = res.statusCode;
            process_checkout_outcome(check_id, check_obj, check_outcome);
        }
    });
    
    req.on('timeout', () => {
        if (!outcome_sent) {
            outcome_sent = true;
            check_outcome.error = 'ERROR: ' + 'timeout';
            process_checkout_outcome(check_id, check_obj, check_outcome);
        }
    });

    req.on('error', (e) => {
        if (!outcome_sent) {
            outcome_sent = true;
            check_outcome.error = 'ERROR: ' + e.message;
            process_checkout_outcome(check_id, check_obj, check_outcome);
        }
    });

    req.end();
}

function process_checkout_outcome(check_id, check_obj, check_outcome) 
{
    const state = !check_outcome.error && check_outcome.status_code && check_obj.success_codes.includes(check_outcome.status_code) ? 'up' : 'down';
    const time_of_last_check = new Date(Date.now());

    check_obj.state = state;
    check_obj.time_of_last_check = time_of_last_check;

    debuglog(`${check_id} (${check_obj.url}): ${check_outcome.status_code} ${state} ${time_of_last_check.toJSON()}`);
    if (check_outcome.error) debuglog(`${check_outcome.error}`);

    const res = update_check(check_id, check_obj);
    if (res.Error) {
        console.error(res.Error);
    }
}

async function start_background_workers() 
{
    console.log('Background workers have started.');

    const start_background_workers_aux = async () => {
        const res = await write_checks_to_disk();
        if (res.Error) {
            console.error('At start_background_workers():\n', res.Error);
        } else {
            const checks_map = get_all_checks();
            checks_map.forEach((check_obj, check_id) => {
                perform_check(check_id, check_obj);
            });
        }
    }

    await start_background_workers_aux();
    setInterval(start_background_workers_aux, 5*1000);
}


module.exports = { start_background_workers };
