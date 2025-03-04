const { readFile } = require('node:fs/promises');
const { resolve } = require('node:path');
const { add_new_check, update_check, delete_check } = require('./data');
const util = require('node:util');
const debuglog = util.debuglog('handlers');

/*
 *  
 *  HTML Handlers
 */

async function checks_list(method, res_data) 
{
    if (method !== 'GET') {
        res_data.status_code = 405;
        return;
    }

    try {
        const page_path = resolve('./index.html');
        let page_content = await readFile(page_path, { encoding: 'utf8' });

        const check_path = resolve('./checks.json');
        const checks_JSON = await readFile('./checks.json', { encoding: 'utf8' });
        const checks_obj = JSON.parse(checks_JSON);
        let checks_HTML = [];
        for (const [key, value] of Object.entries(checks_obj)) {
            checks_HTML.push(`
                <tr>
                    <td>${value.protocol}</td>
                    <td>${value.url}</td>
                    <td>${value.method}</td>
                    <td>${value.success_codes}</td>
                    <td>${value.state}</td>
                </tr>
            `);
        }

        page_content = page_content.replace('{{ rows }}', checks_HTML.join(''));

        res_data.status_code = 200;
        res_data.payload = page_content;
    } catch (error) {
        res_data.status_code = 500;
        res_data.payload = { 'Error': 'Unable to read the index page from disk.' };
        debuglog(error.message);
    }
}

async function assets(req_data, res_data) {
    if (req_data.method !== 'GET') {
        res_data.status_code = 405;
        return;
    }

    const asset_name = req_data.trimmed_path.replace('assets/', '').trim();
    if (asset_name.length > 0) {
        const extension_idx = asset_name.lastIndexOf('.');
        if (extension_idx === -1 || extension_idx === 0 || extension_idx === asset_name.length-1) {
            res_data.status_code = 404;
            res_data.payload = { 'Error': 'Invalid asset name.' };
        }

        const extension = asset_name.substring(extension_idx + 1);
        if (extension === 'css') res_data.content_type = 'text/css';
        else if (extension === 'svg') res_data.content_type = 'image/svg+xml';
        else if (extension === 'js') res_data.content_type = 'text/javascript';
        // TODO maybe plain?
        
        try {
            const asset_content = await readFile('./assets/' + asset_name, { encoding: 'utf8' });
            res_data.status_code = 200;
            res_data.payload = asset_content;
        } catch (error) {
            if (error.code === 'ENOENT') {
                res_data.status_code = 404;
                res_data.payload = { 'Error': `There is no asset called '${asset_name}'.` };
            } else {
                res_data.status_code = 500;
                debuglog(error);
            }
        }

    } else {
        res_data.status_code = 404;
        res_data.payload = { 'Error': 'Invalid asset name.' };
    }
}

/*
 *  
 *  JSON API Handlers
 */

async function handle_check(req_data, res_data) {
    if (req_data.method === 'GET') {
        await handle_check_GET(req_data, res_data);
    } else if (req_data.method === 'POST') {
        await handle_check_POST(req_data, res_data);
    } else if (req_data.method === 'PUT') {
        await handle_check_PUT(req_data, res_data);
    } else if (req_data.method === 'DELETE') {
        await handle_check_DELETE(req_data, res_data);
    } else {
        res_data.status_code = 405;
    }
}

function is_a_valid_check(check_JSON, res_data) {
    let check_obj = null;
    try {
        check_obj = JSON.parse(check_JSON);
    } catch (error) {
        res_data.status_code = 400;
        res_data.payload =  { 'Error': `The payload has not a valid JSON format. Thrown error: ${error.message}.` };
        return false;
    }
    
    let { protocol, url, method, success_codes, timeout_seconds } = check_obj;
    // The user may type in a different case
    protocol = protocol?.toLowerCase();
    method = method?.toUpperCase();

    if (!['http', 'https'].includes(protocol)) {
        res_data.payload = { 'Error': `The specified protocol '${protocol}' is not supported.` };
    } 
    else if (!url || url.length < 1) {
        res_data.payload = { 'Error': `The specified url '${url}' is not a valid url.` };
    }
    else if (!['GET', 'POST', 'PUT', 'DELETE'].includes(method)) {
        res_data.payload = { 'Error': `The specified method '${method}' is not allowed.` };
    } 
    else if (!(success_codes instanceof Array) || success_codes.length < 1) {
        res_data.payload = { 'Error': `Missing required success_codes for the check.` };
    } 
    else if (!timeout_seconds || timeout_seconds < 1 || timeout_seconds > 5) {
        res_data.payload = { 'Error': `The specified timeout_seconds '${timeout_seconds}' is invalid. It has to be a number between 1 and 5.` };
    }
    
    if (res_data.payload.Error) {
        res_data.status_code = 400;
        return false;
    } else {
        return true;
    }
}

async function handle_check_GET(req_data, res_data) {
    const check_id = req_data.search_params.get('id');
    if (check_id && check_id.length === 20) {
        
    } else {
        res_data.status_code = 400;
        res_data.payload = { 'Bad Request': `The id '${check_id}' is invalid.`  };
    }
}

async function handle_check_POST(req_data, res_data) 
{
    if (is_a_valid_check(req_data.payload, res_data)) 
    {
        // Create the id of the check
        const ID_SIZE = 20;
        const id_chars = new Array(ID_SIZE);
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < ID_SIZE; i++) {
            id_chars[i] = chars.charAt(Math.floor(Math.random() * chars.length));
        }
    
        const check_id = id_chars.join('');
        const check_obj = JSON.parse(req_data.payload);
        check_obj.protocol = check_obj.protocol.toLowerCase();
        check_obj.method = check_obj.method.toUpperCase();
        // state and time_of_last_check are the fields updated by the background workers (workers.js)
        check_obj.state = null;
        check_obj.time_of_last_check = null;

        const res = await add_new_check(check_id, check_obj);
        if (res.Error) {
            res_data.status_code = 400;
            res_data.payload = { 'Error': res.Error };
        } else {
            res_data.status_code = 200;
            res_data.payload = { 'Success': 'Check successfully added.', 'id': check_id };
        }
    }
}

async function handle_check_PUT(req_data, res_data) {
    const check_id = req_data.search_params.get('id');
    if (check_id && check_id.length === 20) 
    {
        if (is_a_valid_check(req_data.payload, res_data)) 
        {
            const check_obj = JSON.parse(req_data.payload);
            check_obj.protocol = check_obj.protocol.toLowerCase();
            check_obj.method = check_obj.method.toUpperCase();

            const res = await update_check(check_id, check_obj);
            if (res.Error) {
                res_data.status_code = 400;
                res_data.payload = { 'Error': res.Error };
            } else {
                res_data.status_code = 200;
                res_data.payload = { 'Success': 'Check successfully updated.' };
            }
        }
    } else {
        res_data.status_code = 400;
        res_data.payload = { 'Bad Request': `The id '${check_id}' is invalid.`  };
    }
}

async function handle_check_DELETE(req_data, res_data) {
    const check_id = req_data.search_params.get('id');
    if (check_id && check_id.length === 20) {
        // Delete check
        const res = await delete_check(check_id);
        if (res.Error) {
            res_data.status_code = 400;
            res_data.payload = { 'Error': res.Error };
        } else {
            res_data.status_code = 200;
            res_data.payload = { 'Success': 'Check successfully deleted.' };
        }
    } else {
        res_data.status_code = 400;
        res_data.payload = { 'Bad Request': `The id '${check_id}' is invalid.`  };
    }
}

module.exports = { checks_list, handle_check, assets };
