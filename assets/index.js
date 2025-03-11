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
                console.error('The response payload was not of type JSON or was malformed.');
                console.error('At time:', new Date(Date.now()));
                console.error(error);
                console.error('Known information:\n', 
                    'RESPONSE\n',
                    'status:', xhr.status, '\n',
                    'responseText:', xhr.responseText, '\n',
                    'REQUEST\n',
                    'headers:', headers, '\n', 
                    'path:', path, '\n', 
                    'method:', method, '\n', 
                    'search_params:', search_params, '\n', 
                    'payload:', payload);
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

(function router() {
    let page = document.querySelector('main').id;
    switch (page) {
        case 'dashboard':
            dashboard();
            break;
        case 'create-check':
            create_check();
            break;
        case 'check-edit':
            edit_check();
            break;
        case 'checks-JSON':
            checks_JSON();
            break;
    }
})();

async function dashboard() 
{
    const tbody = document.querySelector("tbody");
    const tr_template = document.querySelector("#check-row");
    const server_feedback = document.querySelector('#server-feedback');

    // const edit_check_btn = document.querySelector('#edit-check-btn');
    const edit_check_link = document.querySelector('#edit-check-link');
    const delete_check_btn = document.querySelector('#delete-check-btn');

    await load_dashboard_data(tbody, tr_template, server_feedback);

    let selected_check = null;
    const add_listener_to_check = (check) => {
        check.addEventListener('click', () => {
            selected_check?.classList.remove('active');
            selected_check = check;
            selected_check.classList.add('active');
            edit_check_link.href = 'check/edit?id=' + selected_check.id;
            delete_check_btn.disabled = false;
        });
    };

    document.addEventListener('click', e => {        
        if (!e.target.classList.contains('data-cell') 
            && e.target !== delete_check_btn 
            && e.target !== edit_check_link) 
        {
            selected_check?.classList.remove('active');
            selected_check = null;
            edit_check_link.href = '#';
            delete_check_btn.disabled = true;
        }
    });

    document.querySelectorAll('tbody tr').forEach(check => add_listener_to_check(check));

    delete_check_btn.addEventListener('click', async () => {
        if (selected_check) {
            let { status_code, payload } = await client_request(undefined, 'api/check', 'DELETE', {'id':selected_check.id}, undefined);
            if (status_code === 200) {
                tbody.removeChild(selected_check);
                server_feedback.className = 'success-msg';
            } else {
                server_feedback.className = 'error-msg';
            }
            server_feedback.textContent = JSON.stringify(payload);
            edit_check_link.href = '#';
            delete_check_btn.disabled = true;
        }
    });

    setInterval(() => {
        update_dashboard_data(tbody, tr_template, server_feedback, add_listener_to_check);
    }, 5000);
}

async function load_dashboard_data(tbody, tr_template, server_feedback) 
{
    let { status_code, payload } = await client_request(undefined, 'api/check/all', 'GET', undefined, undefined);

    if (status_code !== 200) {
        server_feedback.textContent = 'Something went wrong while trying to retrieve checks data.';
        return;
    }

    for (let [check_id, check_obj] of Object.entries(payload)) {
        let check_tr = tr_template.content.cloneNode(true).querySelector('tr');
        check_tr.id = check_id;
        let req_time = 0;
        let res_time = 0;
        for (let [key, value] of Object.entries(check_obj)) {
            if (key === 'req_time') {
                req_time = value;
            } else if (key === 'res_time') {
                res_time = value;
            } else if (key !== 'payload') {
                check_tr.querySelector(`.${key}`).textContent = value;
            }
            if (key === 'status_code') {
                check_tr.querySelector(`.${key}`).classList.add('_' + new String(value).charAt(0));
            }
        }
        check_tr.querySelector('.delta_time').textContent = res_time - req_time;
        tbody.appendChild(check_tr);
    }
}

async function update_dashboard_data(tbody, tr_template, server_feedback, add_listener_to_check) 
{
    let { status_code, payload } = await client_request(undefined, 'api/check/all', 'GET', undefined, undefined);

    if (status_code !== 200) {
        server_feedback.textContent = 'Something went wrong while trying to retrieve checkss data.';
        return;
    }
    
    for (let [check_id, check_obj] of Object.entries(payload)) {
        let check_tr = document.querySelector('#' + check_id);
        let new_check = false;
        if (!check_tr) {
            // It means is a newly created check
            new_check = true;
            check_tr = tr_template.content.cloneNode(true).querySelector('tr');
            check_tr.id = check_id;
            add_listener_to_check(check_tr);
            tbody.appendChild(check_tr);
        }
        let req_time = 0;
        let res_time = 0;
        for (let [key, value] of Object.entries(check_obj)) {
            if (new_check && key ==='url') {
                check_tr.querySelector('.url').textContent = value;
            } else if (new_check && key === 'method') {
                check_tr.querySelector('.method').textContent = value;
            } else if (key === 'req_time') {
                req_time = value;
            } else if (key === 'res_time') {
                res_time = value;
            } else if (key !== 'payload') {
                check_tr.querySelector(`.${key}`).textContent = value;
            }
            if (key === 'status_code') {
                check_tr.querySelector(`.${key}`).classList.add('_' + new String(value).charAt(0));
            }
        }
        check_tr.querySelector('.delta_time').textContent = res_time - req_time;
    }
}

function create_check() 
{
    const submit_btn = document.querySelector('button[type=submit]');
    const url = document.querySelector('#url');
    const textarea = document.querySelector('textarea');
    const server_feedback = document.querySelector('#server-feedback');

    submit_btn.addEventListener('click', async e => {
        e.preventDefault();

        /* NOTE: given that client and server run on the same machine,
        I do not need client-side validation for a fast feedback.
        Therefore, I accept any kind of input and then, the server is gonna tell me if it's wrong. */
        let req_obj = {
            'url': url.value,
            'method': document.querySelector('input[name="method"]:checked')?.value
        };
        
        if (textarea.value) 
        {
            let format = document.querySelector('input[name="format"]:checked')?.value;
            let text = textarea.value.trim();
            if (text && format === 'json') {
                text = textarea.value.replace(/[\s\n\r]+/g, '');
                try {
                    req_obj.payload = JSON.parse(text);
                } catch (error) {
                    server_feedback.className = 'error-msg';
                    server_feedback.textContent = 'Invalid JSON for the payload.';
                    return;
                }
            } 
            else if (text && format === 'text/plain') {
                req_obj.payload = text;
            }
        }       

        let { status_code, payload } = await client_request(undefined, 'api/check', 'POST', undefined, req_obj);

        if (status_code === 200) {
            server_feedback.className = 'success-msg';
        } else {
            server_feedback.className = 'error-msg';
        }
        server_feedback.textContent = JSON.stringify(payload);
    });
}

async function edit_check() 
{
    const submit_btn = document.querySelector('button[type=submit]');
    const id = document.querySelector('#id');
    const url = document.querySelector('#url');
    const textarea = document.querySelector('textarea');
    const server_feedback = document.querySelector('#server-feedback');
   
    id.value = new URLSearchParams(window.location.search).get('id');
    // Fill with the check data
    let { status_code, payload } = await client_request(undefined, 'api/check', 'GET', {id:id.value}, undefined);
    if (status_code !== 200) {
        server_feedback.className = 'error-msg';
        server_feedback.textContent = payload;
        return; // At this point, there is no point in allowing the user to modify a check if it is not possible to retrieve it
    }

    url.value = payload.url;
    document.querySelectorAll('input[name="method"]').forEach(method => {
        if (method.value === payload.method) {
            method.checked = true;
        }
    });
    if (payload.payload) {
        if (typeof payload.payload === 'object') {
            textarea.value = JSON.stringify(payload.payload);
        } else {
            textarea.value = payload.payload;
        }
    }

    submit_btn.addEventListener('click', async e => {
        e.preventDefault();
        let req_obj = {
            'url': url.value,
            'method': document.querySelector('input[name="method"]:checked')?.value
        };
        
        if (textarea.value) {
            let format = document.querySelector('input[name="format"]:checked')?.value;
            let text = textarea.value.trim();
            if (text && format === 'json') {
                text = textarea.value.replace(/[\s\n\r]+/g, '');
                try {
                    req_obj.payload = JSON.parse(text);
                } catch (error) {
                    server_feedback.className = 'error-msg';
                    server_feedback.textContent = 'Invalid JSON for the payload.';
                    return;
                }
            } 
            else if (text && format === 'text/plain') {
                req_obj.payload = text;
            }
        }

        let { status_code, payload } = await client_request(undefined, 'api/check', 'PUT', {'id':id.value}, req_obj);
        
        if (status_code === 200) {
            server_feedback.className = 'success-msg';
        } else {
            server_feedback.className = 'error-msg';
        }
        server_feedback.textContent = JSON.stringify(payload);
    });
}

async function checks_JSON() {
    const server_feedback = document.querySelector('#server-feedback');

    let { status_code, payload } = await client_request(undefined, 'api/check/all', 'GET', undefined, undefined);
    
    if (status_code === 200) {
        document.querySelector('pre').textContent = JSON.stringify(payload, undefined, 4);
    } else {
        server_feedback.className = 'error-msg';
        server_feedback.textContent = JSON.stringify(payload);
    }
}


