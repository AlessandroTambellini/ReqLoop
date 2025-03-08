const http = require('node:http');
const https = require('node:https');
const { get_copy_of_checks_map, update_check, write_checks_to_disk } = require('./data');
const util = require('node:util');
const debuglog = util.debuglog('workers');

function perform_check(check_id, check_obj) 
{
    const url_obj = new URL(check_obj.url);

    const options = {
        'method': check_obj.method
    };
    
    let payload_str = null;
    if (check_obj.method === 'POST' || check_obj.method === 'PUT') {
        payload_str = JSON.stringify(check_obj.payload);
        options.headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload_str)
        };
    }

    const module_to_use = url_obj.protocol.split(':')[0] === 'http' ? http : https;
    const req = module_to_use.request(url_obj, options);
    check_obj.req_time = Date.now();

    /* To update the check I listen just for the 'response' and 'error' events but,
    they are mutually exclusive. If you fires, the other will not.
    So, the variable res_obj_sent is useless. */

    req.on('response', async (res) => 
    {    
        debuglog(`response: ${check_id} (${check_obj.url})`);
        check_obj.res_status_code = res.statusCode;
        check_obj.res_time = Date.now();
        if (options.method === 'POST') {
            // console.log(res.statusMessage);
        }
        res.setEncoding('utf8');
        let chunks = [];
        res.on('data', (chunk) => {
            chunks.push(chunk);
        });

        res.on('end', () => {
            if (options.method === 'POST') {
                // console.log(chunks.join(''));
            }
            update_check(check_id, check_obj);
        });
    });

    req.on('error', (err) => 
    {
        console.error('error: ' + err);
        check_obj.res_err_code = err.code;
        update_check(check_id, check_obj);
    });

    req.on('close', () => {
        // console.log('The connection for ' + check_obj.url + ' has been closed.');
    });

    if (check_obj.method === 'POST' || check_obj.method === 'PUT') {
        req.write(payload_str);
    }
    req.end();
}

async function start_background_workers() 
{
    console.log('Background workers have started.');

    const start_background_workers_aux = async () => {
        const res = await write_checks_to_disk();
        if (res.Error) {
            console.error('At start_background_workers():\n', res.Error);
        } else {
            get_copy_of_checks_map().forEach((check_obj, check_id) => {
                perform_check(check_id, check_obj);
            });
        }
    }

    await start_background_workers_aux();
    setInterval(start_background_workers_aux, 5*1000);
}


module.exports = { start_background_workers };
