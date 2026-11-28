/*
 * Captures mic audio, downsamples to 16 kHz mono and posts Int16 PCM
 * frames to the main thread (default 1600 samples = 100 ms = 3200 bytes).
 *
 * Sarvam streaming STT needs raw 16 kHz PCM16, not WebM/Opus.
 */
class PCMDownsampler extends AudioWorkletProcessor {
  constructor(options) {
    super();

    const opts = options.processorOptions || {};

    this.targetRate = opts.targetRate || 16000;
    this.frameSize = opts.frameSamples || 1600;

    // `sampleRate` is the AudioContext's rate (e.g. 48000 or 44100).
    this.ratio = sampleRate / this.targetRate;

    this.buffer = new Int16Array(this.frameSize);
    this.bufferLen = 0;

    // Box-filter downsampling: average the input samples that fall
    // inside each output sample. Cheap and good enough for speech.
    this.acc = 0;
    this.accCount = 0;
    this.pos = 0;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];

    if (!channel) {
      return true;
    }

    for (let i = 0; i < channel.length; i++) {
      this.acc += channel[i];
      this.accCount += 1;
      this.pos += 1;

      if (this.pos >= this.ratio) {
        this.pos -= this.ratio;

        const s = Math.max(-1, Math.min(1, this.acc / this.accCount));

        this.buffer[this.bufferLen++] = s < 0 ? s * 0x8000 : s * 0x7fff;

        this.acc = 0;
        this.accCount = 0;

        if (this.bufferLen === this.frameSize) {
          const out = this.buffer.slice(0).buffer;

          this.port.postMessage(out, [out]);

          this.bufferLen = 0;
        }
      }
    }

    return true;
  }
}

registerProcessor("pcm-downsampler", PCMDownsampler);