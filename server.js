const http = require('node:http');
const { StringDecoder } = require('node:string_decoder');
const { handle_check } = require('./handlers');

const PORT = 8000;
const server = http.createServer();

server.on('request', (req, res) => 
{
    const url = new URL(req.url, 'http://localhost:' + PORT);
    const trimmed_path = url.pathname.replace(/^\/+|\/+$/g, '');
    const decoder = new StringDecoder('utf8');
    const decoded_buffers = [];

    req.on('data', (buffer) => {
        decoded_buffers.push(decoder.write(buffer));
    });

    req.on('end', async () => 
    {
        decoded_buffers.push(decoder.end());

        const req_data = {
            'trimmed_path': trimmed_path,
            'search_params': new URLSearchParams(url.searchParams),
            'method': req.method,
            'headers': req.headers,
            'payload': decoded_buffers.join(''),
        };

        const res_data = {
            'content_type': 'application/json',
            'status_code': 200,
            'payload': {},
        };

        switch (trimmed_path) {
            case 'ping':
                res_data.status_code = 200;
                res_data.content_type = 'text/plain';
                res_data.payload = 'ok\n';
                break;
            // case '':
            //     await get_index_page(res_data);
            //     break;
            case 'api/check':
                res_data.content_type = 'application/json';
                await handle_check(req_data, res_data);
                break;
            default:
                res_data.status_code = 404;
                res_data.content_type = 'application/json';
                res_data.payload = {'Error': `The path '${trimmed_path}' is not available.`};
                break;
        }

        const payload_string = res_data.content_type === 'application/json' ? JSON.stringify(res_data.payload) : res_data.payload;

        res.setHeader('Content-Type', res_data.content_type);
        res.writeHead(res_data.status_code);
        res.end(payload_string + '\n'); // given I use curl on the terminal, I want the string to go ahead
    });
});

server.on('listening', () => {
    console.log(`Listening on port ${PORT}`);
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error('Address in use, retrying...');
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
