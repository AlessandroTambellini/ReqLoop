const { readFile } = require('node:fs/promises');
const dns = require('node:dns/promises');
const { add_new_check, update_check, delete_check, get_copy_of_checks_map, get_check_by_id } = require('./data');
const util = require('node:util');
const debuglog = util.debuglog('handlers');

/*
 *  
 *  HTML Handlers
 */

// I use this trick because an es module cannot have top-level await.
let _header = _footer = null;
(async () => {
    _header = await readFile('./templates/_header.html', { encoding: 'utf8' });
    _footer = await readFile('./templates/_footer.html', { encoding: 'utf8' });
})();

function not_found_page() {
    return _header + '<p>404, Not Found.</p>' + _footer;
}

async function dashboard(method, res_data) 
{
    if (method !== 'GET') {
        res_data.status_code = 405;
        return;
    }

    try {
        let page_content = await readFile('./templates/dashboard.html', { encoding: 'utf8' });
        res_data.content_type = 'text/html';
        res_data.status_code = 200;
        res_data.payload = _header + page_content + _footer;
    } catch (error) {
        res_data.status_code = 500;
        res_data.payload = { 'Error': 'Unable to read HTML page from disk.' };
        debuglog(error.message);
    }
}

async function check_create(method, res_data) {
    if (method !== 'GET') {
        res_data.status_code = 405;
        return;
    }

    try {
        let page_content = await readFile('./templates/check_create.html', { encoding: 'utf8' });
        res_data.content_type = 'text/html';
        res_data.status_code = 200;
        res_data.payload = _header + page_content + _footer;
    } catch (error) {
        res_data.status_code = 500;
        res_data.payload = { 'Error': 'Unable to read HTML page from disk.' };
        debuglog(error);
    }
}

async function check_edit(method, res_data) {
    if (method !== 'GET') {
        res_data.status_code = 405;
        return;
    }

    try {
        let page_content = await readFile('./templates/check_edit.html', { encoding: 'utf8' });
        res_data.content_type = 'text/html';
        res_data.status_code = 200;
        res_data.payload = _header + page_content + _footer;
    } catch (error) {
        res_data.status_code = 500;
        res_data.payload = { 'Error': 'Unable to read HTML page from disk.' };
        debuglog(error);
    }
}

async function assets(req_data, res_data) {
    if (req_data.method !== 'GET') {
        res_data.status_code = 405;
        return;
    }

    const asset_name = req_data.trimmed_pathname.replace('assets/', '').trim();
    if (asset_name.length > 0) {
        let extension_idx = asset_name.lastIndexOf('.');
        if (extension_idx === -1 || extension_idx === 0 || extension_idx === asset_name.length-1) {
            res_data.status_code = 404;
            res_data.payload = { 'Error': 'Invalid asset name.' };
        }

        let extension = asset_name.substring(extension_idx + 1);
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

function retrieve_all_checks(method, res_data) {
    if (method !== 'GET') {
        res_data.status_code = 405;
        return;
    }

    let checks_map = get_copy_of_checks_map();
    let checks_obj = Object.fromEntries(checks_map);
    res_data.status_code = 200;
    res_data.payload = checks_obj;
}

async function handle_check(req_data, res_data) {
    if (req_data.method === 'GET') {
        handle_check_GET(req_data, res_data);
    } else if (req_data.method === 'POST') {
        await handle_check_POST(req_data, res_data);
    } else if (req_data.method === 'PUT') {
        await handle_check_PUT(req_data, res_data);
    } else if (req_data.method === 'DELETE') {
        handle_check_DELETE(req_data, res_data);
    } else {
        res_data.status_code = 405;
    }
}

async function is_a_valid_check(check_JSON, res_data) {
    let check_obj = null;
    try {
        check_obj = JSON.parse(check_JSON);
    } catch (error) {
        res_data.status_code = 400;
        res_data.payload =  { 'Error': `The payload has not a valid JSON format. Thrown error: ${error.message}.` };
        return false;
    }
    
    let { url, method } = check_obj;
    // The user may type in a different case
    method = method?.toUpperCase();

    try {
        let url_obj = new URL(url);
        let protocol = url_obj.protocol.split(':')[0];
        if (!['http', 'https'].includes(protocol)) {
            res_data.payload = { 'Error': `The specified protocol '${protocol}' is not supported.` };
        }
        await dns.lookup(url_obj.hostname);
    } catch (error) {
        res_data.payload = { 'Error': `The specified url '${url}' is not a valid url. Error code: ${error.code}.` };
    }

    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(method)) {
        res_data.payload = { 'Error': `The specified method '${method}' is not allowed.` };
    }

    if (res_data.payload.Error) {
        res_data.status_code = 400;
        return false;
    } else {
        return true;
    }
}

function handle_check_GET(req_data, res_data) {
    const check_id = req_data.search_params.get('id');
    let check_obj = get_check_by_id(check_id);
    if (check_obj) {
        res_data.status_code = 200;
        res_data.payload = check_obj;
    } else {
        res_data.status_code = 404;
        res_data.payload = { 'Error': `The id ${check_id} is invalid.`  };
    }
}

async function handle_check_POST(req_data, res_data) 
{
    if (await is_a_valid_check(req_data.payload, res_data)) 
    {
        // Create the id of the check
        const id_chars = new Array(20);
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        id_chars[0] = 'a'; // in HTML an id starting with a number is not valid
        for (let i = 1; i < 20; i++) {
            id_chars[i] = chars.charAt(Math.floor(Math.random() * chars.length));
        }
    
        const check_id = id_chars.join('');
        const check_obj = JSON.parse(req_data.payload);
        check_obj.method = check_obj.method.toUpperCase();

        const res = add_new_check(check_id, check_obj);
        if (res.Error) {
            res_data.status_code = 400;
            res_data.payload = { 'Error': res.Error };
        } else {
            res_data.status_code = 200;
            res_data.payload = { 'Success': 'Check successfully added. Check id: ' + check_id };
        }
    }
}

async function handle_check_PUT(req_data, res_data) {
    const check_id = req_data.search_params.get('id');
    if (check_id && check_id.length === 20) 
    {
        if (await is_a_valid_check(req_data.payload, res_data)) 
        {
            const check_obj = JSON.parse(req_data.payload);
            check_obj.method = check_obj.method.toUpperCase();

            const res = update_check(check_id, check_obj);
            if (res.Error) {
                res_data.status_code = 400;
                res_data.payload = { 'Error': res.Error };
            } else {
                res_data.status_code = 200;
                res_data.payload = { 'Success': `Check with id '${check_id}' successfully updated.` };
            }
        }
    } else {
        res_data.status_code = 400;
        res_data.payload = { 'Error': `The id '${check_id}' is invalid.`  };
    }
}

function handle_check_DELETE(req_data, res_data) {
    const check_id = req_data.search_params.get('id');
    if (check_id && check_id.length === 20) {
        const res = delete_check(check_id);
        if (res.Error) {
            res_data.status_code = 400;
            res_data.payload = { 'Error': res.Error };
        } else {
            res_data.status_code = 200;
            res_data.payload = { 'Success': `Check with id '${check_id}' successfully deleted.` };
        }
    } else {
        res_data.status_code = 400;
        res_data.payload = { 'Error': `The id '${check_id}' is invalid.`  };
    }
}

module.exports = { not_found_page, dashboard, check_create, check_edit, assets, retrieve_all_checks, handle_check };
