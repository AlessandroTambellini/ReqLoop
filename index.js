const { setup_data_dir, store_checks_in_memory } = require("./lib/data.js");
const { init_REPL_server } = require("./lib/repl.js");
const { start_server, close_server } = require("./lib/server.js");
const { start_background_workers } = require("./lib/workers.js");

async function init_app() 
{
    start_server();

    let res = await setup_data_dir();
    if (res.Error) {
        console.error(res.Error);
        close_server();
        return;
    } else {
        console.log(res.Success);
    }

    res = await store_checks_in_memory(); 
    if (res.Error) {
        console.error(res.Error);
        close_server();
        return;        
    } else {
        console.log(res.Success);
    }
    
    await start_background_workers();
    init_REPL_server();
}

init_app();
