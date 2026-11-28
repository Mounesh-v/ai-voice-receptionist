/*
 * Streams a mic MediaStream as 16 kHz mono PCM16 frames.
 *
 *   const stop = await startPcmStream(stream, (pcmArrayBuffer) => { ... });
 *   ...
 *   await stop();
 *
 * Uses the device's native sample rate for the capture context (Firefox
 * rejects mismatched rates) and downsamples inside the worklet.
 * This is a separate AudioContext from the playback one in VoiceRecorder.
 */
export async function startPcmStream(stream, onChunk) {
  const ctx = new AudioContext();

  await ctx.audioWorklet.addModule("/pcm-worklet.js");

  const source = ctx.createMediaStreamSource(stream);

  const node = new AudioWorkletNode(ctx, "pcm-downsampler", {
    processorOptions: { targetRate: 16000, frameSamples: 1600 },
  });

  node.port.onmessage = (event) => onChunk(event.data);

  // Some browsers only run a worklet that reaches the destination.
  // Route through a muted gain so the mic is never played back.
  const mute = ctx.createGain();

  mute.gain.value = 0;

  source.connect(node);
  node.connect(mute);
  mute.connect(ctx.destination);

  if (ctx.state === "suspended") {
    await ctx.resume();
  }

  return async function stop() {
    node.port.onmessage = null;

    try {
      source.disconnect();
      node.disconnect();
      mute.disconnect();
    } catch {
      // Already disconnected.
    }

    await ctx.close().catch(() => {});
  };
}