/* Solidity compile worker. Loads the solc WebAssembly build served from this
 * origin (public/vendor/soljson.js, copied from the solc npm package) and
 * compiles standard-JSON input off the main thread.
 *
 * Messages in:  { id, input }            (input is the solc standard-JSON object)
 * Messages out: { id, type: 'log', line } while working,
 *               { id, type: 'result', output } (parsed standard-JSON output) or
 *               { id, type: 'error', message } if the compiler could not run.
 */
let compile = null;
let loading = null;

function load(log) {
    if (compile) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
        log('Loading the Solidity compiler…');
        self.Module = {
            onRuntimeInitialized() {
                try {
                    compile = self.Module.cwrap('solidity_compile', 'string', ['string', 'number', 'number']);
                    const version = self.Module.cwrap('solidity_version', 'string', [])();
                    log('Compiler ready: solc ' + version);
                    resolve();
                } catch (e) {
                    reject(e);
                }
            },
        };
        try {
            importScripts('/vendor/soljson.js');
        } catch (e) {
            reject(new Error('Could not load the compiler (/vendor/soljson.js). Run `npm run predev` or rebuild the app.'));
        }
    });
    return loading;
}

self.onmessage = async (event) => {
    const { id, input } = event.data;
    const log = (line) => self.postMessage({ id, type: 'log', line });
    try {
        await load(log);
        log('Compiling…');
        const output = JSON.parse(compile(JSON.stringify(input), 0, 0));
        self.postMessage({ id, type: 'result', output });
    } catch (e) {
        self.postMessage({ id, type: 'error', message: e instanceof Error ? e.message : String(e) });
    }
};
