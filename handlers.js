// const { readFile } = require('node:fs/promises');
// const { resolve } = require('node:path');
const { add_new_check, update_check, delete_check } = require('./data');

// async function get_index_page(res_data) {
//     try {
//         const page_path = resolve('./index.html');
//         const page_content = await readFile(page_path, { encoding: 'utf8' });
//         res_data.content_type = 'text/html';
//         res_data.status_code = 200;
//         res_data.payload = page_content;
//     } catch (error) {
//         res_data.status_code = 500;
//         res_data.payload = error.message;
//     }
// }

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
        res_data.status_code = 400;
        res_data.payload = { 'Error': `The passed method '${req_data.method}' is not supported.` };
    }
}

function is_a_valid_check(check_obj, res_data) {
    try {
        check_obj = JSON.parse(check_obj);
    } catch (error) {
        res_data.status_code = 400;
        res_data.payload =  { 'Error': `The payload has not a valid JSON format. Thrown error: ${error.message}.` };
        return false;
    }

    let { protocol, url, method, success_codes, timeout_seconds } = check_obj;
    // The user may type in a different case
    if (protocol) protocol = protocol.toLowerCase();
    if (method) method = method.toUpperCase();

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
        // Create check id
        const ID_SIZE = 20;
        const id_chars = new Array(ID_SIZE);
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < ID_SIZE; i++) {
            id_chars[i] = chars.charAt(Math.floor(Math.random() * chars.length));
        }
    
        const check_id = id_chars.join('');
        const check_obj = JSON.parse(req_data.payload);
        // state and time_of_last_check are the fields updated by the background workers (workers.js)
        check_obj.state = null, 
        check_obj.time_of_last_check = null

        if (await add_new_check(check_id, check_obj)) {
            res_data.status_code = 200;
            res_data.payload = { 'Success': 'Check successfully appended.' };
        } else {
            res_data.status_code = 500;
            res_data.payload = { 'Error': 'Unable to append the check.' };
        }
    }
}

async function handle_check_PUT(req_data, res_data) {
    const check_id = req_data.search_params.get('id');
    if (check_id && check_id.length === 20) 
    {
        if (is_a_valid_check(req_data.payload, res_data)) {
            // Update check
            if (await update_check(check_id, JSON.parse(req_data.payload))) {
                res_data.status_code = 200;
                res_data.payload = { 'Success': 'Check successfully updated.' };
            } else {
                res_data.status_code = 500;
                res_data.payload = { 'Error': 'Unable to update the check.' };
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
        if (await delete_check(check_id)) {
            res_data.status_code = 200;
            res_data.payload = { 'Success': 'Check successfully deleted.' };
        } else {
            res_data.status_code = 500;
            res_data.payload = { 'Error': 'Unable to delete the check.' };
        }
    } else {
        res_data.status_code = 400;
        res_data.payload = { 'Bad Request': `The id '${check_id}' is invalid.`  };
    }
}


module.exports = { handle_check };
