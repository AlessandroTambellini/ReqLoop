function client_request(headers, path, method, search_params, payload) 
{
    headers = typeof headers === 'object' ? headers : {};
    path = typeof path === 'string' ? path : '';
    method = typeof method === 'string' ? method.toUpperCase() : 'GET';
    search_params = typeof search_params === 'object' ? search_params : {};
    payload = typeof payload === 'object' ? payload : {};
     
    const url = path; // + search_params
    const payload_str = JSON.stringify(payload);

    /*
     *
     * Request
     */
    
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true); // TODO build the method
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    for (const [key, value] of Object.entries(headers)) {
        xhr.setRequestHeader(key, value);
    }

    xhr.send(payload_str);

    /*
     *
     *  Response
     */
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            const res_obj = {
                'status_code': xhr.status,
                'res_xhr': null
            };

            // if (xhr.) there must be some way to check the content-type of the response
            try {
                const res_xhr_obj = JSON.parse(xhr.responseText);
                res_obj.res_xhr = res_xhr_obj
            } catch (error) {
                // I need the res_xhr just if it's a JSON.
            }

            return res_obj;
        }
    }
}

