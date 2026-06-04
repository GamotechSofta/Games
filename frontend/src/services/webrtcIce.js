/**
 * Trickle ICE: queue remote candidates until setRemoteDescription completes.
 */

export function createIceCandidateQueue(pc) {
  const queue = [];

  const flush = async () => {
    if (!pc?.remoteDescription) return;
    while (queue.length) {
      const candidate = queue.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('[ice] add candidate failed', err);
      }
    }
  };

  return {
    async add(candidate) {
      if (!candidate || !pc) return;
      if (pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          queue.push(candidate);
          await flush();
        }
      } else {
        queue.push(candidate);
      }
    },
    async markRemoteReady() {
      await flush();
    },
    clear() {
      queue.length = 0;
    },
  };
}

export function waitForIceGatheringComplete(pc, timeoutMs = 10000) {
  return new Promise((resolve) => {
    if (!pc || pc.iceGatheringState === 'complete') {
      resolve();
      return;
    }
    const finish = () => {
      pc.removeEventListener('icegatheringstatechange', onChange);
      clearTimeout(timer);
      resolve();
    };
    const onChange = () => {
      if (pc.iceGatheringState === 'complete') finish();
    };
    pc.addEventListener('icegatheringstatechange', onChange);
    const timer = setTimeout(finish, timeoutMs);
  });
}
