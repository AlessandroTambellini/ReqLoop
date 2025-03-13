const { readFile } = require('node:fs/promises');
const dns = require('node:dns/promises');
const { 
    get_copy_of_checks_map,
    get_check_by_id,
    add_new_check,
    update_check,
    delete_check
} = require('./data');
const util = require('node:util');
const debuglog = util.debuglog('handlers');

/*
*  
*  HTML Handlers
*/

// I use this trick because an ES5 module does not allow top-level await.
let template_header = template_footer = null;
(async () => {
    /* NOTE: in Node.js, 
    the path resolution depends on the current working directory (CWD) 
    when the Node.js process is started, 
    not on the location of the JavaScript file that contains the function call.
    Therefore, I can write './templates/<whatever_sub_dir>' */
    template_header = await readFile('templates/_header.html', { encoding: 'utf8' });
    template_footer = await readFile('templates/_footer.html', { encoding: 'utf8' });
})();

async function not_found_page(res_data) 
{
    try {
        let page_content = await readFile('templates/not_found.html', { encoding: 'utf8' });
        let page_header = template_header
            .replace('{{ page_title }}', '404 | Not Found')
            .replace('{{ description }}', 'Not Found page')
            .replace('{{ page_style }}', 'not_found');
        res_data.content_type = 'text/html';
        res_data.status_code = 404;
        res_data.payload = page_header + page_content + template_footer;
    } catch (error) {
        res_data.status_code = 500;
        res_data.payload = { 'Error': 'Unable to read HTML page from disk.' };
        debuglog(error.message);
    }
}

async function dashboard(method, res_data) 
{
    if (method !== 'GET') {
        res_data.status_code = 405;
        return;
    }

    try {
        let page_content = await readFile('templates/dashboard.html', { encoding: 'utf8' });
        let page_header = template_header
            .replace('{{ page_title }}', 'Dashboard')
            .replace('{{ description }}', 'Checks Dashboard')
            .replace('{{ page_style }}', 'dashboard');
        res_data.content_type = 'text/html';
        res_data.status_code = 200;
        res_data.payload = page_header + page_content + template_footer;
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
        let page_content = await readFile('templates/check_create.html', { encoding: 'utf8' });
        let page_header = template_header
            .replace('{{ page_title }}', 'Create Check')
            .replace('{{ description }}', 'Create a check')
            .replace('{{ page_style }}', 'check_create');
        res_data.content_type = 'text/html';
        res_data.status_code = 200;
        res_data.payload = page_header + page_content + template_footer;
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
        let page_content = await readFile('templates/check_edit.html', { encoding: 'utf8' });
        let page_header = template_header
            .replace('{{ page_title }}', 'Edit Check')
            .replace('{{ description }}', 'Edit a check')
            .replace('{{ page_style }}', 'check_edit');
        res_data.content_type = 'text/html';
        res_data.status_code = 200;
        res_data.payload = page_header + page_content + template_footer;
    } catch (error) {
        res_data.status_code = 500;
        res_data.payload = { 'Error': 'Unable to read HTML page from disk.' };
        debuglog(error);
    }
}

async function checks_JSON(method, res_data) {
    if (method !== 'GET') {
        res_data.status_code = 405;
        return;
    }

    try {
        let page_content = await readFile('templates/checks_JSON.html', { encoding: 'utf8' });
        let page_header = template_header
            .replace('{{ page_title }}', 'Checks JSON')
            .replace('{{ description }}', 'Visualize the checks JSON')
            .replace('{{ page_style }}', 'checks_JSON');
        res_data.content_type = 'text/html';
        res_data.status_code = 200;
        res_data.payload = page_header + page_content + template_footer;
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

    let asset_sub_path = req_data.trimmed_pathname.split('assets/')[1];
    if (!asset_sub_path) {
        res_data.status_code = 404;
        res_data.payload = { 'Error': `The path '${req_data.trimmed_pathname}' is invalid to load an asset.` };
        return;
    }

    let file_ext_idx = asset_sub_path.lastIndexOf('.');
    if (file_ext_idx < 1 || file_ext_idx === asset_sub_path.length-1) {
        res_data.status_code = 404;
        res_data.payload = { 'Error': `The path '${asset_sub_path}' has not a valid asset name.` };
        return;
    }

    let file_ext = asset_sub_path.substring(file_ext_idx + 1);
    if (file_ext === 'css') res_data.content_type = 'text/css';
    else if (file_ext === 'svg') res_data.content_type = 'image/svg+xml';
    else if (file_ext === 'js') res_data.content_type = 'text/javascript';
    else {
        res_data.status_code = 404;
        res_data.payload = { 'Error': `There is no asset with the extension '${file_ext}'.` };
        return;
    }

    try {
        let asset_content = await readFile(`assets/${asset_sub_path}`, { encoding: 'utf8' });
        res_data.status_code = 200;
        res_data.payload = asset_content;
    } catch (error) {
        res_data.content_type = 'application/json';
        if (error.code === 'ENOENT') {
            res_data.status_code = 404;
            res_data.payload = { 'Error': `The asset '${asset_sub_path}' does not exist.` };
        } else {
            res_data.status_code = 500;
            res_data.payload = { 'Error': `Un unknown error has occured while trying to read '${asset_sub_path}' from disk.` };
            debuglog(error);
        }
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
            res_data.payload = { 'Error': `The protocol '${protocol}' is not supported.` };
        }
        await dns.lookup(url_obj.hostname);
    } catch (error) {
        res_data.payload = { 'Error': `The url '${url}' is not a valid url. Error code: ${error.code}.` };
    }

    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(method)) {
        res_data.payload = { 'Error': `The method '${method}' is not allowed.` };
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
    let res = get_check_by_id(check_id);
    if (res.Error) {
        res_data.status_code = 404;
    } else {
        res_data.status_code = 200;
    }
    res_data.payload = res;
}

async function handle_check_POST(req_data, res_data) 
{
    if (await is_a_valid_check(req_data.payload, res_data)) 
    {
        // Create the id of the check
        const id_chars = new Array(20);
        /* NOTE: if you decide to add other symbols for the id geneation,
        bare in mind that UPPERCASE letters would be a problem,
        because the commands passed to the REPL (repl.js) are
        lowercased. Therefore, would not be possible to retrive a check 
        by its id. So, you either exclude the uppercase letters from the list of
        the possible symbols or you modify REPL to not lowercase the input cmd. */
        const head_chars = 'abcdefghijklmnopqrstuvwxyz';
        const body_chars = head_chars + '0123456789';
        // in HTML an id starting with a number is not valid
        id_chars[0] = head_chars.charAt(Math.floor(Math.random() * head_chars.length));
        for (let i = 1; i < 20; i++) {
            id_chars[i] = body_chars.charAt(Math.floor(Math.random() * body_chars.length));
        }
    
        const check_id = id_chars.join('');
        const check_obj = JSON.parse(req_data.payload);
        check_obj.method = check_obj.method.toUpperCase();

        let res = add_new_check(check_id, check_obj);
        if (res.Error) {
            res_data.status_code = 400;
        } else {
            res_data.status_code = 200;
        }
        res_data.payload = res;
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

            let res = update_check(check_id, check_obj);
            if (res.Error) {
                res_data.status_code = 400;
            } else {
                res_data.status_code = 200;
            }
            res_data.payload = res;
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
        } else {
            res_data.status_code = 200;
        }
        res_data.payload = res;
    } else {
        res_data.status_code = 400;
        res_data.payload = { 'Error': `The id '${check_id}' is invalid.`  };
    }
}

module.exports = { 
    not_found_page, 
    dashboard, 
    check_create, 
    check_edit, 
    checks_JSON, 
    assets, 
    retrieve_all_checks, 
    handle_check 
};
