const { setup_data_dir, store_checks_in_memory, write_checks_to_disk } = require("./lib/data.js");
const { init_main_REPL } = require("./lib/repl.js");
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
    console.log(performance.now())
    res = await write_checks_to_disk();
    console.log(performance.now())
    if (res.Error) {
        console.error(res.Error);
        return;
    }
    
    start_background_workers();
    start_server();
    init_main_REPL();
}

/* If the user kills the app while data is being written to disk,
handle the killing signal, try again to write to disk and finally exit the process.
In case of SIGKILL (kill -9), there is nothing I can do,
and it that case the data is lost. */

process.on('SIGINT', async () => {
    let res = await write_checks_to_disk();
    if (res.Error) {
        console.error(res.Error);
    } else {
        console.log(''); // To print the prompt on new line
    }
    process.exit(0);
});

console.log(`Process ID: ${process.pid}`);
  
process.on('SIGTERM', async () => {
    console.log('sigterm received. closing the app');
    let res = await write_checks_to_disk();
    if (res.Error) {
        console.error(res.Error);
    } else {
        console.log(''); // To print the prompt on new line
    }
    console.log('app closed');
    process.exit(0);
});

init_app();
