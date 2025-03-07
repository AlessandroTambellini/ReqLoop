const http = require('node:http');
const https = require('node:https');
const { get_copy_of_checks_map, update_check, write_checks_to_disk } = require('./data');
const util = require('node:util');
const debuglog = util.debuglog('workers');
const { StringDecoder } = require('node:string_decoder');
const decoder = new StringDecoder('utf8');

function perform_check(check_id, check_obj) 
{
    const url_obj = new URL(check_obj.url);

    // for put and post requests
    const req_options = {
        'method': check_obj.method,
        'payload': null
    };
    
    const module_to_use = url_obj.protocol.split(':')[0] === 'http' ? http : https;
    const req = module_to_use.request(url_obj);
    check_obj.req_time = Date.now();

    /* To update the check I listen just for the 'response' and 'error' events but,
    they are mutually exclusive. If you fires, the other will not.
    So, the variable res_obj_sent is useless. */

    req.on('response', async (res) => 
    {    
        debuglog(`response: ${check_id} (${check_obj.url})`);
        check_obj.res_status_code = res.statusCode;
        check_obj.res_time = Date.now();
        
        // Consume the response data
        let decoded_buffer = '';
        res.on('data', (chunk) => {
            decoded_buffer += decoder.write(chunk);
        });

        res.on('end', (chunk) => {
            decoded_buffer += decoder.end(chunk);
            // console.log(check_obj.url, decoded_buffer);
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
