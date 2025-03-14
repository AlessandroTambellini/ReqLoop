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
    const feedback = document.querySelector('#feedback');

    const edit_check_link = document.querySelector('#edit-check-link');
    const delete_check_btn = document.querySelector('#delete-check-btn');

    await load_dashboard_data(tbody, tr_template, feedback);

    let selected_check = null;

    const toggle_buttons = (enable) => {
        edit_check_link.ariaDisabled = enable ? false : true;
        delete_check_btn.ariaDisabled = enable ? false : true;
        if (enable) {
            edit_check_link.classList.add('enabled');
            delete_check_btn.classList.add('enabled');
            edit_check_link.href = 'check/edit?id=' + selected_check.id;
        } else {
            edit_check_link.classList.remove('enabled');
            delete_check_btn.classList.remove('enabled');
            edit_check_link.href = '#';
        }
    }

    const select_check = (e) => {
        selected_check?.classList.remove('active');
        selected_check = e.target.parentElement; // because the click happens on a <td>
        selected_check.classList.add('active');
        toggle_buttons(true);
    }

    document.addEventListener('click', e => {        
        if (!e.target.classList.contains('data-cell') 
            && e.target !== delete_check_btn && e.target.parentElement !== delete_check_btn
            && e.target !== edit_check_link && e.target.parentElement !== edit_check_link)      
        {
            selected_check?.classList.remove('active');
            selected_check = null;
            toggle_buttons(false);
        }
    });

    // table.tBodies[0].children is a HTMLCollection that does not have the .forEach() property
    for (let i = 0; i < table.tBodies[0].children.length; i++) {
        table.tBodies[0].children[i].addEventListener('click', select_check);
    }

    delete_check_btn.addEventListener('click', async () => {
        if (selected_check) {
            let { status_code, payload } = await client_request(undefined, 'api/check', 'DELETE', {'id':selected_check.id}, undefined);
            if (status_code === 200) {
                table.tBodies[0].removeChild(selected_check);
                selected_check = null;
                feedback.className = 'success-msg';
                feedback.textContent = payload.Success;
                if (table.tBodies[0].children.length === 0) {
                    no_checks_display.style.display = 'flex';
                    table.style.display = 'none';
                }
            } else {
                feedback.className = 'error-msg';
                feedback.textContent = payload.Error;
            }
            feedback.style.display = 'block';
            toggle_buttons(false);    
        }
    });

    setInterval(() => {
        update_dashboard_data(tbody, tr_template, feedback, add_listener_to_check);
    }, 5000);

    /*
     *
     *  UI
     */

    const main = document.querySelector('main');
    const thead = document.querySelector('thead');
    const nav_icons = document.querySelectorAll('#dashboard-buttons img');
    const resize_observer = new ResizeObserver(entries => 
    {
        for (let entry of entries) {
            thead.style.fontSize = `${Math.max(1, entry.contentRect.width / 1000)}rem`;
            tbody.style.fontSize = `${Math.max(.9, entry.contentRect.width / 1050)}rem`;
            nav_icons.forEach(icon => {
                icon.style.width = `${Math.max(2.5, entry.contentRect.width / 400)}rem`;
            });
        }
    });
    
    resize_observer.observe(main);
}

async function load_dashboard_data(tbody, tr_template, feedback) 
{
    let { status_code, payload } = await client_request(undefined, 'api/check/all', 'GET', undefined, undefined);

    if (status_code !== 200) {
        feedback.textContent = 'Something went wrong while trying to retrieve checks data.';
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

async function update_dashboard_data(tbody, tr_template, feedback, add_listener_to_check) 
{
    let { status_code, payload } = await client_request(undefined, 'api/check/all', 'GET', undefined, undefined);

    if (status_code !== 200) {
        feedback.textContent = 'Something went wrong while trying to retrieve checkss data.';
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
    const feedback = document.querySelector('#feedback');

    submit_btn.addEventListener('click', async e => {
        e.preventDefault();

        let req_obj = {};
        fill_req_obj(req_obj, url, textarea, feedback);      

        let { status_code, payload } = await client_request(undefined, 'api/check', 'POST', undefined, req_obj);

        if (status_code === 200) {
            feedback.className = 'success-msg';
        } else {
            feedback.className = 'error-msg';
        }
        feedback.textContent = JSON.stringify(payload);
    });
}

async function edit_check() 
{
    const submit_btn = document.querySelector('button[type=submit]');
    const id = document.querySelector('#id');
    const url = document.querySelector('#url');
    const textarea = document.querySelector('textarea');
    const feedback = document.querySelector('#feedback');
   
    // Fill with the check data
    id.value = new URLSearchParams(window.location.search).get('id');
    
    let res = await client_request(undefined, 'api/check', 'GET', {id:id.value}, undefined);
    let status_code = res.status_code;
    let res_obj = res.payload; // I change the name to avoid writing 'payload.payload' in the textarea.

    if (status_code !== 200) {
        feedback.className = 'error-msg';
        feedback.textContent = 'Unable to retrieve the check data.';
        return; // At this point, there is no point in allowing the user to modify a check if it is not possible to retrieve it
    }

    // Fill the url
    url.value = res_obj.url;

    // Fill the method
    document.querySelectorAll('input[name="method"]').forEach(method_option => {
        if (method_option.value === res_obj.method) {
            method_option.checked = true;
        }
    });

    // Fill the format and the textarea
    if (res_obj.payload)
    {
        let format = typeof res_obj.payload === 'object' ? 'json' : 'text/plain';
        document.querySelectorAll('input[name="format"]').forEach(format_option => {
            if (format_option.value === format) {
                format_option.checked = true;
            }
        });
    
        if (format === 'json') {
            textarea.value = JSON.stringify(res_obj.payload);
        } else {
            textarea.value = res_obj.payload;
        }
    }

    submit_btn.addEventListener('click', async e => {
        e.preventDefault();

        let req_obj = {};
        fill_req_obj(req_obj, url, textarea, feedback);

        let { status_code, payload } = await client_request(undefined, 'api/check', 'PUT', {'id':id.value}, req_obj);
        
        if (status_code === 200) {
            feedback.className = 'success-msg';
            feedback.textContent = payload.Success;
        } else {
            feedback.className = 'error-msg';
            feedback.textContent = payload.Error;
        }
        feedback.style.display = 'block';
    });
}

function fill_req_obj(req_obj, url, textarea, feedback) 
{
        let url_value = url.value.trim();
        if (url_value.length < 1) {
            feedback.className = 'error-msg';
            feedback.textContent = 'Invalid url.';
            return;
        }
        
    req_obj.url = url_value;
    req_obj.method = document.querySelector('input[name="method"]:checked')?.value;
        
        if (textarea.value) 
        {
            let format = document.querySelector('input[name="format"]:checked')?.value;
            let text = textarea.value.trim();
            if (text && format === 'json') {
                text = textarea.value.replace(/[\s\n\r]+/g, '');
                try {
                    req_obj.payload = JSON.parse(text);
                } catch (error) {
                    feedback.className = 'error-msg';
                    feedback.textContent = 'Invalid JSON for the payload.';
                    return;
                }
            } 
            else if (text && format === 'text/plain') {
                req_obj.payload = text;
            }
        }
}

async function checks_JSON() {
    const feedback = document.querySelector('#feedback');

    let { status_code, payload } = await client_request(undefined, 'api/check/all', 'GET', undefined, undefined);
    
    if (status_code === 200) {
        document.querySelector('pre').textContent = JSON.stringify(payload, undefined, 4);
    } else {
        feedback.className = 'error-msg';
        feedback.textContent = JSON.stringify(payload);
    }
}
