/**
 * Trickle ICE: queue remote candidates until setRemoteDescription completes.
 */

export function serializeIceCandidate(candidate) {
  if (!candidate) return null;
  if (typeof candidate.toJSON === 'function') return candidate.toJSON();
  return candidate;
}

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

/** Wait briefly so SDP may include first host/srflx candidates (max 400ms). */
export function waitForInitialCandidates(pc, timeoutMs = 400) {
  return new Promise((resolve) => {
    if (!pc || pc.iceGatheringState === 'complete') {
      resolve();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      pc.removeEventListener('icecandidate', onCandidate);
      clearTimeout(timer);
      resolve();
    };
    const onCandidate = (e) => {
      if (e.candidate) finish();
    };
    pc.addEventListener('icecandidate', onCandidate);
    const timer = setTimeout(finish, timeoutMs);
  });
}
