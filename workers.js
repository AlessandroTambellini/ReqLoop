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
    const state = !check_outcome.error && check_outcome.status_code && check_obj.success_codes.includes(check_outcome.status_code) ? 'up' : 'down';
    const time_of_last_check = Date.now();

    check_obj.state = state;
    check_obj.time_of_last_check = time_of_last_check;

    if (await update_check(check_id, check_obj)) {
        console.log(`The check with id '${check_id}' has been updated.`);
    } else {
        console.error(`Unable to update the check with id '${check_id}'.`);
    }
}

function start_background_workers() {
    setInterval(async () => {
        if (await write_checks_to_disk()) 
        {
            get_all_checks().forEach((check_obj, check_id) => {
                perform_check(check_id, check_obj);
            });
        } else {
            console.error('Unable to write the checks to disk.');
        }
    }, 10*1000);
}


module.exports = { start_background_workers };
