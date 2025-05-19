const http = require('node:http');
const { StringDecoder } = require('node:string_decoder');
const { 
    not_found_page,
    dashboard,
    check_create,
    check_edit,
    checks_JSON,
    assets,
    retrieve_all_checks,
    handle_check,
} = require('./handlers.js');
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

    let decoded_buffer = [];

    req.on('data', (buffer) => {
        decoded_buffer.push(decoder.write(buffer));
    });

    req.on('end', async () => 
    {
        decoded_buffer.push(decoder.end());
        decoded_buffer = decoded_buffer.join('');

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

        // For whatever reason, an error might be thrown while handling a request
        try {
            // Router
            switch (trimmed_pathname) {
                // Test
            case 'ping':
                res_data.status_code = 200;
                break;
                // Pages
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
            case 'checks-JSON':
                await checks_JSON(req_data.method, res_data);
                break;
                // APIs
            case 'api/check':
                await handle_check(req_data, res_data);
                break;
            case 'api/check/all':
                retrieve_all_checks(req_data.method, res_data);
                break;
            default:
                if (trimmed_pathname.includes('assets/')) {
                    await assets(req_data, res_data);
                } else {
                    if (req.headers.accept?.includes('text/html')) {
                        await not_found_page(res_data);
                    } else {
                        res_data.payload = {'Error': `The path '${trimmed_pathname}' is not available.`};
                        res_data.status_code = 404;                    
                    }
                }
            }
        } catch (error) {
            res_data.content_type = 'application/json';
            res_data.status_code = 500;
            res_data.payload = { 'Error': 'Un unknown error has occured.' };
            console.error('Un unknown error has occured in the server. Known information:');
            console.error('At time:', new Date(Date.now()));
            console.error(error);
            console.error('Request data:', req_data);
        }
        
        if (res_data.status_code === 405) {
            /* Given that this msg is always the same for the 405 status code,
            I write here just once, instead of repeating it for each handler. */
            res_data.payload = { 'Error': `The method '${req_data.method}' is not allowed.` };
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
    console.log(`[INFO] Listening on port ${PORT}`);
    console.log(`[INFO] Open the web interface at http://localhost:${PORT}`);
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.log('[WARN] Address in use, retrying...');
        setTimeout(() => {
            server.close();
            server.listen(PORT);
        }, 1000);
    } else {
        console.error('[ERROR] An error has occured while trying to start the server.');
    }
});

server.on('close', () => {
    console.log('[INFO] Server has been closed.');
});

function start_server() {
    server.listen(PORT);
}

module.exports = { start_server };
