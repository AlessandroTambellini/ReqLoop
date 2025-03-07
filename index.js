const { store_checks_in_memory, setup_data_dir } = require("./data");
const { start_server, kill_server } = require("./server");
const { start_background_workers } = require("./workers");

async function init_app() {
    start_server();
    if (!await setup_data_dir()) {
        kill_server();
        return;
    }
    if (!await store_checks_in_memory()) {
        kill_server();
        return;
    }
    await start_background_workers();
}

init_app();
