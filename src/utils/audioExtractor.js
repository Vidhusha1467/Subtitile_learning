/**
 * Decodes the audio track of a video/audio File into a
 * mono Float32Array resampled to 16 000 Hz — required by Whisper.
 *
 * @param {File} file   Any video or audio file the browser can decode.
 * @returns {Promise<Float32Array>}
 */
export const extractAudioFromFile = async (file) => {
  const arrayBuffer = await file.arrayBuffer();

  // OfflineAudioContext processes audio without playback
  const AudioCtx = window.AudioContext || /** @type {typeof AudioContext} */ (window['webkitAudioContext']);
  const tempCtx = new AudioCtx();
  const decoded = await tempCtx.decodeAudioData(arrayBuffer);
  await tempCtx.close();

  const targetSampleRate = 16_000;
  const numChannels      = decoded.numberOfChannels;
  const origLength       = decoded.length;
  const origRate         = decoded.sampleRate;

  // Mix down to mono
  const mono = new Float32Array(origLength);
  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = decoded.getChannelData(ch);
    for (let i = 0; i < origLength; i++) {
      mono[i] += channelData[i] / numChannels;
    }
  }

  // Resample to 16 kHz using OfflineAudioContext
  const targetLength = Math.round(origLength * (targetSampleRate / origRate));
  const offlineCtx   = new OfflineAudioContext(1, targetLength, targetSampleRate);

  const buffer = offlineCtx.createBuffer(1, origLength, origRate);
  buffer.copyToChannel(mono, 0);

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(offlineCtx.destination);
  source.start();

  const rendered = await offlineCtx.startRendering();
  return rendered.getChannelData(0);
};
