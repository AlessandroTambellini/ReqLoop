const { store_checks_in_memory } = require("./data");
const { start_server } = require("./server");
const { start_background_workers } = require("./workers");

async function init_app() {
    start_server();
    await store_checks_in_memory();
    start_background_workers();
}

init_app();
