const { setup_data_dir, store_checks_in_memory, write_checks_to_disk } = require("./lib/data.js");
const { init_REPL_server } = require("./lib/repl.js");
const { start_server, close_server } = require("./lib/server.js");
const { start_background_workers } = require("./lib/workers.js");

async function init_app() 
{
    let res = await setup_data_dir();
    if (res.Error) {
        console.error(res.Error);
        return;
    }

    console.log(res.Success);
    
    res = await store_checks_in_memory(); 
    if (res.Error) {
        console.error(res.Error);
        return;        
    } 
    
    console.log(res.Success);
    
    // Make sure it is possible to write back to disk,
    // Before starting the app
    res = await write_checks_to_disk();
    if (res.Error) {
        console.error(res.Error);
        return;
    }
    
    await start_background_workers();
    start_server();
    init_REPL_server();
}

init_app();
