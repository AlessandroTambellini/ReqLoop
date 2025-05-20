const http = require('node:http');
const https = require('node:https');
const data = require('./data.js');
const util = require('node:util');
const logs = require('./logs.js');
const debuglog = util.debuglog('workers');

const TIMEOUT = 5000;

function perform_check(check_id, check_obj) 
{
    let url_obj;
    try {
        url_obj = new URL(check_obj.url);
    } catch (error) {
        console.error('[ERROR]', `The url '${check_obj.url}' is invalid. Perhaps, the checks.json data was manually corrupted.`);
        return false;
    }

    const options = {
        'method': check_obj.method,
        'timeout': TIMEOUT
    };
    
    let payload_str = null;

    /* By following the RESTful convention,
    sending a payload with GET and DELETE shouldn't be needed.
    However, I don't see why I should stop the user from doing so.
    Therefore, I don't check what the method is before sending the request:
    if a payload is present, I send it. */
    // if (check_obj.method === 'POST' || check_obj.method === 'PUT') {
    if (check_obj.payload) {
        if (typeof check_obj.payload !== 'string') {
            payload_str = JSON.stringify(check_obj.payload);
        } else {
            payload_str = check_obj.payload;
        }
        options.headers = {
            'Content-Type': typeof check_obj.payload === 'object' ? 'application/json' : 'text/plain',
            'Content-Length': Buffer.byteLength(payload_str)
        };
    }

    const module_to_use = url_obj.protocol.split(':')[0] === 'http' ? http : https;
    const req = module_to_use.request(url_obj, options);
    check_obj.req_time = Date.now();

    // 'f' stands for flag
    let f_res_already_catched = false;

    req.on('response', async (res) => 
    {    
        if (f_res_already_catched) return;
        f_res_already_catched = true;

        debuglog(`response: ${check_id} (${check_obj.url})`);
        
        check_obj.status_code = res.statusCode;
        check_obj.res_time = Date.now();
        check_obj.err_code = null;
        
        res.setEncoding('utf8');
        let chunks = [];
        res.on('data', (chunk) => {
            chunks.push(chunk);
        });
        
        res.on('end', () => {
            data.update_check(check_id, check_obj);
        });
    });

    req.on('timeout', () => {
        if (f_res_already_catched) return;
        f_res_already_catched = true;
        check_obj.res_time = check_obj.req_time + TIMEOUT;
        check_obj.err_code = 'ETIMEDOUT';
        data.update_check(check_id, check_obj);
        req.destroy();
    });
    
    req.on('error', (err) =>
    {
        if (f_res_already_catched) return;
        f_res_already_catched = true;
        console.error('[ERROR]', err.message);
        check_obj.res_time = Date.now();
        check_obj.err_code = err.code;
        data.update_check(check_id, check_obj);
    });

    req.on('close', () => {
        debuglog(`The connection for ${check_obj.url} [${check_id}] has been closed.`);
    });

    if (check_obj.payload) {
        req.write(payload_str);
    }
    req.end();

    return true;
}

function compress_logs() {
    setInterval(async () => 
    {
        let filenames = await logs.gather_filenames();
        filenames.forEach(async (filename) => 
        {
            let compressed_log_name = filename + '_' + Date.now();
            let res = await logs.compress(filename, compressed_log_name);
            if (!res.Error) {
                res = await logs.truncate(filename);
                if (res.Error) console.log(res.Error);
            }
        });

    }, 24*60*60*1000);
}

function start_background_workers() 
{
    console.log('[INFO] Background workers have started.');

    const perform_checks = async () => {
        let res = await data.write_checks_to_disk();
        if (res.Error) {
            console.error('[ERROR]', res.Error);
            console.error('[ERROR]', 'Background workers aborted.');
            clearInterval(timeout);
        } else {
            data.get_copy_of_checks_map().forEach(async (check_obj, check_id) => 
            {
                if (perform_check(check_id, check_obj)) {
                    // Save to .log file
                    res = await logs.append(check_id, check_obj);
                    if (res.Error) {
                        console.error('[ERROR]', res.Error);
                    }
                }
            });
        }
    }

    perform_checks();
    compress_logs();

    let timeout = setInterval(perform_checks, TIMEOUT); // req loop
}

module.exports = { start_background_workers };
