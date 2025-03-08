function client_request(headers = {}, path, method, search_params = {}, payload = {}) 
{
    if (typeof headers !== 'object' || typeof search_params !== 'object' || typeof payload !== 'object') {
        console.error('headers, search_params and payload have to be objects');
        return;
    }

    if (typeof path !== 'string' || typeof method !== 'string') {
        console.error('path and method have to be strings.');
        return;
    }

    let url = path + '?'; // + search_params
    let counter = 0;
    for (let [key, value] of Object.entries(search_params)) {
        if (counter > 0) url += '&';
        url += key + '=' + value;
        counter += 1;
    }
    
    const payload_str = JSON.stringify(payload);

    return new Promise(function (resolve, reject) {
        
        /*
         * Request
         */

        const xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        for (const [key, value] of Object.entries(headers)) {
            xhr.setRequestHeader(key, value);
        }
    
        xhr.send(payload_str);
    
        /*
         *  Response
         */
        
        // Request completed successfully
        xhr.onload = () => {
            let res_obj = {};
            res_obj.status_code = xhr.status;
            try {
                let payload_obj = JSON.parse(xhr.responseText);
                res_obj.payload = payload_obj;
            } catch (error) {
                console.error(error);
            }
            resolve(res_obj);
        }

        xhr.onerror = () => {
            reject({
                status_code: xhr.status,
                status_text: xhr.statusText
            });
        };
    });
}

async function load_dashboard_data() 
{
    let { status_code, payload } = await client_request(undefined, 'api/check/all', 'GET', undefined, undefined);

    // Populate the dashboard table
    const tbody = document.querySelector("tbody");
    const template = document.querySelector("#check-row");
    
    for (let [check_id, check_obj] of Object.entries(payload)) {
        let clone = template.content.cloneNode(true);            
        let tr = clone.querySelector('tr');
        tr.id = check_id;
        let req_time = 0;
        let res_time = 0;
        for (let [key, value] of Object.entries(check_obj)) {
            if (key ==='url') {
                tr.querySelector('.url').textContent = value;
            } else if (key === 'method') {
                tr.querySelector('.method').textContent = value;
            } else if (key === 'status_code') {
                tr.querySelector('.status-code').textContent = value;
            } else if (key === 'err_code' && check_obj.err_code) {
                tr.querySelector('.err-code').textContent = value;
            } else if (key === 'req_time') {
                req_time = value;
            } else if (key === 'res_time') {
                res_time = value;
            }
        }
        tr.querySelector('.delta-time').textContent = res_time - req_time;
        tbody.appendChild(clone);
    }
}

async function update_dashboard_data() 
{
    let { status_code, payload } = await client_request(undefined, 'api/check/all', 'GET', undefined, undefined);

    for (let [check_id, check_obj] of Object.entries(payload)) {
        const check_row = document.querySelector('#' + check_id);
        let req_time = 0;
        let res_time = 0;
        for (let [key, value] of Object.entries(check_obj)) {
            if (key === 'status_code') {
                check_row.querySelector('.status-code').textContent = value;
            } else if (key === 'err_code' && check_obj.err_code) {
                check_row.querySelector('.err-code').textContent = value;
            } else if (key === 'req_time') {
                req_time = value;
            } else if (key === 'res_time') {
                res_time = value;
            }
        }
        check_row.querySelector('.delta-time').textContent = res_time - req_time;
    }
}

async function router() {
    let page = document.querySelector('main').id;
    if (page === 'dashboard') 
    {
        dashboard();
    }
    else if (page === 'create-check') {
        create_check();
    }
    else if (page === 'check-edit') {
        edit_check();
    }
}

async function dashboard() 
{
    await load_dashboard_data();

    const edit_check_btn = document.querySelector('#edit-check-btn');
    const delete_check_btn = document.querySelector('#delete-check-btn');
    const server_feedback = document.querySelector('#server-feedback');

    let selected_row_id = null;
    document.querySelectorAll('tbody tr').forEach(row => {
        row.addEventListener('click', e => {
            selected_row_id = row.id;
            edit_check_btn.querySelector('a').href = 'check/edit?id=' + selected_row_id;
            edit_check_btn.disabled = false;
            delete_check_btn.disabled = false;
        });
    });

    delete_check_btn.addEventListener('click', async e => {
        if (selected_row_id) {
            let res = await client_request(undefined, 'api/check', 'DELETE', {'id':selected_row_id}, undefined);
            if (res.payload) {
                server_feedback.textContent = JSON.stringify(res.payload);
            }
        }
    });

    setInterval(update_dashboard_data, 5000);
}

/*
NOTE: given that client and server run on the same machine,
I do not need client-side validation for a fast feedback.
Therefore, I accept any kind of input and the server is gonna tell me if it's wrong.
*/
function create_check() {
    const submit_btn = document.querySelector('button[type=submit]');
    const url = document.querySelector('#url');
    const textarea = document.querySelector('textarea');
    const server_feedback = document.querySelector('#server-feedback');
    submit_btn.addEventListener('click', async e => {
        e.preventDefault();
        let payload = {
            'url': url.value,
            'method': document.querySelector('input[name="method"]:checked')?.value
        };
        if (textarea.value) {
            payload.payload = textarea.value;
            try {
                payload.payload = JSON.parse(payload.payload);
            } catch (error) {
                // If it's not valid JSON, I assume is text/plain
            }
        }       
        let res = await client_request(undefined, 'api/check', 'POST', undefined, payload);

        if (res.payload) {
            server_feedback.textContent = JSON.stringify(res.payload);
        }
    });
}

function edit_check() 
{
    const submit_btn = document.querySelector('button[type=submit]');
    const id = document.querySelector('#id');
    const url = document.querySelector('#url');
    const textarea = document.querySelector('textarea');
    const server_feedback = document.querySelector('#server-feedback');
   
    const urlParams = new URLSearchParams(window.location.search);
    id.value = urlParams.get('id');

    submit_btn.addEventListener('click', async e => {
        e.preventDefault();
        let payload = {
            'url': url.value,
            'method': document.querySelector('input[name="method"]:checked')?.value
        };
        if (textarea.value) {
            payload.payload = textarea.value;
            try {
                payload.payload = JSON.parse(payload.payload);
            } catch (error) {
                // If it's not valid JSON, I assume is text/plain
            }
        }   
        let res = await client_request(undefined, 'api/check', 'PUT', {'id':id.value}, payload);
        if (res.payload) {
            server_feedback.textContent = JSON.stringify(res.payload);
        }
    });
}

router();


