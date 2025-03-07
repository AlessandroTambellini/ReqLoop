const http = require('node:http');
const { StringDecoder } = require('node:string_decoder');
const { dashboard, handle_check, assets, check_create, check_edit, retrieve_all_checks } = require('./handlers');
const util = require('node:util');
const debuglog = util.debuglog('server');
const decoder = new StringDecoder('utf8');

const PORT = 8000;
const server = http.createServer();

server.on('request', (req, res) => 
{
    // Sanitize the url: https://datatracker.ietf.org/doc/html/rfc3986
    let url = req.url.replace(/[^a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]/g, '');
    let url_obj = new URL(url, 'http://localhost:' + PORT);
    let trimmed_pathname = url_obj.pathname.replace(/^\/+|\/+$/g, '');

    /* At first, I used an array called decoded_buffers
    to not everytime reassing the variable to a new string.
    But, I've noticed the max buffer size is 64KB before the data is splitted in two packets.
    So, storing the strings in an array to then concatenate them toghether instead of directly reassigning the variable to a new string,
    does not seem at all an optimization given that for the data I expect to be sent,
    the buffer will never be splitted in more packets of data. */
    let decoded_buffer = '';

    req.on('data', (buffer) => {
        decoded_buffer += decoder.write(buffer);
    });

    req.on('end', async () => 
    {
        decoded_buffer += decoder.end();

        // Mah, most of this data is actually anused.
        const req_data = {
            'trimmed_pathname': trimmed_pathname,
            'search_params': new URLSearchParams(url_obj.searchParams),
            'method': req.method,
            'headers': req.headers,
            'payload': decoded_buffer
        };

        const res_data = {
            'content_type': 'application/json',
            'status_code': 500,
            'payload': {}
        };

        // Router
        switch (trimmed_pathname) {
            case 'ping':
                res_data.status_code = 200;
                break;
            case '':
            case 'check/all':
            case 'dashboard':
                await dashboard(req_data.method, res_data);
                break;
            case 'check/create':
                await check_create(req_data.method, res_data);
                break;
            case 'check/edit':
                await check_edit(req_data.method, res_data);
                break;
            case 'api/check':
                handle_check(req_data, res_data);
                break;
            case 'api/check/all':
                retrieve_all_checks(req_data.method, res_data);
                break;
            default:
                if (trimmed_pathname.includes('assets/')) {
                    await assets(req_data, res_data);
                } else {
                    res_data.status_code = 404;
                    res_data.payload = {'Error': `The path '${trimmed_pathname}' is not available.`};
                }
        }

        const payload_string = res_data.content_type === 'application/json' ? JSON.stringify(res_data.payload) : res_data.payload;

        res.strictContentLength = true;
        res.writeHead(res_data.status_code, {
            'Content-Length': Buffer.byteLength(payload_string),
            'Content-Type': res_data.content_type,
        });
        res.end(payload_string);

        debuglog(`${req.method} /${trimmed_pathname} ${res_data.status_code}`);
    });
});

server.on('listening', () => {
    console.log(`Listening on port ${PORT}`);
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.log('Address in use, retrying...');
        setTimeout(() => {
            server.close();
            server.listen(PORT);
        }, 1000);
    } else {
        console.error('An error has occured while trying to start the server.');
    }
});

function start_server() {
    server.listen(PORT);
}

module.exports = { start_server };
