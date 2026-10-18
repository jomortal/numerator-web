// Runs the Core engine (engine.wasm) on the browser's audio thread.
class NumeratorProcessor extends AudioWorkletProcessor
{
    constructor (options)
    {
        super();

        // The engine needs nothing from outside; any import it asks for gets a stub.
        const stubs = new Proxy ({}, { get: () => new Proxy ({}, { get: () => () => 0 }) });

        WebAssembly.instantiate (options.processorOptions.wasm, stubs).then (({ instance }) =>
        {
            this.engine = instance.exports;

            if (this.engine._initialize)
                this.engine._initialize();

            this.engine.prepare (sampleRate);
        });

        this.port.onmessage = (event) =>
        {
            const message = event.data;

            if (this.engine && message.type === "noteOn")
                this.engine.noteOn (message.note, message.velocity, message.length);
        };
    }

    process (inputs, outputs)
    {
        const output = outputs[0];

        if (! this.engine || output.length === 0)
            return true;

        const numSamples = output[0].length;
        const leftAt = this.engine.render (numSamples) / 4;
        const rightAt = this.engine.getRight() / 4;
        const memory = new Float32Array (this.engine.memory.buffer);

        output[0].set (memory.subarray (leftAt, leftAt + numSamples));

        if (output.length > 1)
            output[1].set (memory.subarray (rightAt, rightAt + numSamples));

        return true;
    }
}

registerProcessor ("numerator", NumeratorProcessor);
