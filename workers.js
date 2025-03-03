const http = require('node:http');
const https = require('node:https');
const { get_all_checks, update_check, write_checks_to_disk } = require('./data');

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
        check_outcome.status_code = res.statusCode;
        if (!outcome_sent) {
            outcome_sent = true;
            process_checkout_outcome(check_id, check_obj, check_outcome);
        }
    });

    req.on('timeout', () => {
        check_outcome.error = { 'error': true, 'value': 'timeout' };
        if (!outcome_sent) {
            outcome_sent = true;
            process_checkout_outcome(check_id, check_obj, check_outcome);
        }
    });

    req.on('error', (e) => {
        check_outcome.error = { 'error': true, 'value': e };
        if (!outcome_sent) {
            outcome_sent = true;
            process_checkout_outcome(check_id, check_obj, check_outcome);
        }
    });

    req.end();
}

async function process_checkout_outcome(check_id, check_obj, check_outcome) 
{
    // console.log(`The server of ${check_obj.url} has responded with status code ${check_outcome.status_code}.`);
    const state = !check_outcome.error && check_outcome.status_code && check_obj.success_codes.includes(check_outcome.status_code) ? 'up' : 'down';
    const time_of_last_check = new Date(Date.now());

    check_obj.state = state;
    check_obj.time_of_last_check = time_of_last_check;

    /* check_obj, check_outcome, state, time_of_check (-> review time_of_last_check) */

    const res = await update_check(check_id, check_obj);
    if (res.Error) {
        console.error(res.Error);
    }
}

function start_background_workers() {
    // TODO not sure this is a good position for this log. 
    // It's not clear if the workers have started or not.
    console.log('Background workers have started.');
    setInterval(async () => {
        const res = await write_checks_to_disk();
        if (res.Error) {
            console.error('At start_background_workers():\n', res.Error);
        } else {
            get_all_checks().forEach((check_obj, check_id) => {
                perform_check(check_id, check_obj);
            });
        }
    }, 5*1000);
}


module.exports = { start_background_workers };
