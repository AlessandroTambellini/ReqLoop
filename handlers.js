const { readFile } = require('node:fs/promises');
const { resolve } = require('node:path');
const dns = require('node:dns');
const { add_new_check, update_check, delete_check, get_copy_of_checks_map, get_check_by_id } = require('./data');
const util = require('node:util');
const debuglog = util.debuglog('handlers');

/*
 *  
 *  HTML Handlers
 */

async function check_edit(method, res_data) {
    if (method !== 'GET') {
        res_data.status_code = 405;
        return;
    }

    try {
        let _header = await readFile('./templates/_header.html', { encoding: 'utf8' });
        let _footer = await readFile('./templates/_footer.html', { encoding: 'utf8' });
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

async function check_create(method, res_data) {
    if (method !== 'GET') {
        res_data.status_code = 405;
        return;
    }

    try {
        let _header = await readFile('./templates/_header.html', { encoding: 'utf8' });
        let _footer = await readFile('./templates/_footer.html', { encoding: 'utf8' });
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

async function dashboard(method, res_data) 
{
    if (method !== 'GET') {
        res_data.status_code = 405;
        return;
    }

    try {
        let _header = await readFile('./templates/_header.html', { encoding: 'utf8' });
        let _footer = await readFile('./templates/_footer.html', { encoding: 'utf8' });
        let page_content = await readFile('./templates/dashboard.html', { encoding: 'utf8' });

        // const check_path = resolve('./checks.json');
        // const checks_JSON = await readFile('./checks.json', { encoding: 'utf8' });
        // const checks_obj = JSON.parse(checks_JSON);
        // let checks_HTML = [];
        // for (const [key, value] of Object.entries(checks_obj)) {
        //     checks_HTML.push(`
        //         <tr>
        //             <td>${value.protocol}</td>
        //             <td>${value.url}</td>
        //             <td>${value.method}</td>
        //             <td>${value.res_status_code}</td>
        //             <td>${value.res_time}</td>
        //             <td>${value.res_err_code}</td>
        //         </tr>
        //     `);
        // }

        // page_content = page_content.replace('{{ rows }}', checks_HTML.join(''));

        res_data.content_type = 'text/html';
        res_data.status_code = 200;
        res_data.payload = _header + page_content + _footer;
    } catch (error) {
        res_data.status_code = 500;
        res_data.payload = { 'Error': 'Unable to read HTML page from disk.' };
        debuglog(error.message);
    }
}

async function assets(req_data, res_data) {
    if (req_data.method !== 'GET') {
        res_data.status_code = 405;
        return;
    }

    const asset_name = req_data.trimmed_pathname.replace('assets/', '').trim();
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

function handle_check(req_data, res_data) {
    if (req_data.method === 'GET') {
        handle_check_GET(req_data, res_data);
    } else if (req_data.method === 'POST') {
        handle_check_POST(req_data, res_data);
    } else if (req_data.method === 'PUT') {
        handle_check_PUT(req_data, res_data);
    } else if (req_data.method === 'DELETE') {
        handle_check_DELETE(req_data, res_data);
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
    
    let { url, method } = check_obj;
    // The user may type in a different case
    method = method?.toUpperCase();

    try {
        let url_obj = new URL(url);
        let protocol = url_obj.protocol.split(':')[0];
        if (!['http', 'https'].includes(protocol)) {
            res_data.payload = { 'Error': `The specified protocol '${protocol}' is not supported.` };
        }
        dns.lookup(url_obj.hostname, (err) => {
            if (err) {
                res_data.payload = { 'Error': `Unable to lookup specified url '${url}'. Error code: ${err.code}.` };
            }
        });
    } catch (error) {
        res_data.payload = { 'Error': `The specified url '${url}' is not a valid url. Error code: ${error.code}.` };
    }

    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(method)) {
        res_data.payload = { 'Error': `The specified method '${method}' is not allowed.` };
    }

    /* Again, like explained in workers.js,
    How am I to stop the user from making POST requests without a payload? */
    // if (method === 'POST' || method === 'PUT') {
    //     if (!check_obj.hasOwnProperty('payload')) {
    //         res_data.payload = { 'Error': `The method '${method}' requires a payload.` };
    //     }
    // }

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

function handle_check_POST(req_data, res_data) 
{
    if (is_a_valid_check(req_data.payload, res_data)) 
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

function handle_check_PUT(req_data, res_data) {
    const check_id = req_data.search_params.get('id');
    if (check_id && check_id.length === 20) 
    {
        if (is_a_valid_check(req_data.payload, res_data)) 
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

module.exports = { dashboard, handle_check, assets, check_create, check_edit, retrieve_all_checks };
