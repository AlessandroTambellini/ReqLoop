const http = require('node:http');
const { StringDecoder } = require('node:string_decoder');
const { checks_list, handle_check, assets } = require('./handlers');
const util = require('node:util');
const debuglog = util.debuglog('server');

const PORT = 8000;
const server = http.createServer();

server.on('request', (req, res) => 
{
    const url = new URL(req.url, 'http://localhost:' + PORT);
    const trimmed_path = url.pathname.replace(/^\/+|\/+$/g, '');
    const decoder = new StringDecoder('utf8');

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

        const req_data = {
            'trimmed_path': trimmed_path,
            'search_params': new URLSearchParams(url.searchParams),
            'method': req.method,
            'headers': req.headers,
            'payload': decoded_buffer,
        };

        const res_data = {
            'content_type': '',
            'status_code': -1,
            'payload': {},
        };

        // Router
        switch (trimmed_path) {
            case 'ping':
                res_data.content_type = 'application/json';
                res_data.status_code = 200;
                break;
            case '':
            case 'checks/all':
                res_data.content_type = 'text/html';
                await checks_list(req_data.method, res_data);
                break;
            case 'checks/create':
                // checksCreate
                break;
            case 'checks/edit':
                // checksEdit
                break;
            case 'api/check':
                res_data.content_type = 'application/json';
                await handle_check(req_data, res_data);
                break;
            default:
                if (trimmed_path.includes('assets/')) {
                    await assets(req_data, res_data);
                } else {
                    res_data.status_code = 404;
                    res_data.content_type = 'application/json';
                    res_data.payload = {'Error': `The path '${trimmed_path}' is not available.`};
                }
                break;
        }

        const payload_string = res_data.content_type === 'application/json' ? JSON.stringify(res_data.payload) + '\n' : res_data.payload;

        res.setHeader('Content-Type', res_data.content_type);
        res.writeHead(res_data.status_code);
        res.end(payload_string);

        debuglog(`${req.method} /${trimmed_path} ${res_data.status_code}`);
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
