const { store_checks_in_memory, setup_data_dir } = require("./data");
const { start_server } = require("./server");
const { start_background_workers } = require("./workers");

async function init_app() {
    start_server();
    // TODO kill the server if unable to set up the data directory and store the checks in memory
    await setup_data_dir();
    await store_checks_in_memory();
    await start_background_workers();
}

init_app();
