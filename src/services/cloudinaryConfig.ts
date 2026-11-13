export const CLOUDINARY_CONFIG = {
  cloudName: "qish0wed",
  apiKey: "954158273719457",
  apiSecret: "NZQtYLwmEVIDLlfVVpLD4ZRqJig",
  baseUrl: "https://api.cloudinary.com/v1_1/qish0wed",
};

// Pure JavaScript SHA-1 implementation ensuring 100% compatibility across all browsers/iframes
export function sha1(str: string): string {
  function rotateLeft(n: number, s: number) {
    return (n << s) | (n >>> (32 - s));
  }
  function cvtHex(val: number) {
    let strHex = '', v;
    for (let i = 7; i >= 0; i--) {
      v = (val >>> (i * 4)) & 0x0f;
      strHex += v.toString(16);
    }
    return strHex;
  }
  const utf8 = unescape(encodeURIComponent(str));
  const words: number[] = [];
  for (let i = 0; i < utf8.length; i++) {
    words[i >> 2] |= (utf8.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }
  const bitLen = utf8.length * 8;
  words[bitLen >> 5] |= 0x80 << (24 - (bitLen % 32));
  words[(((bitLen + 64) >> 9) << 4) + 15] = bitLen;

  let H0 = 0x67452301, H1 = 0xefcdab89, H2 = 0x98badcfe, H3 = 0x10325476, H4 = 0xc3d2e1f0;
  const W = new Array(80);

  for (let i = 0; i < words.length; i += 16) {
    let A = H0, B = H1, C = H2, D = H3, E = H4;
    for (let t = 0; t < 80; t++) {
      if (t < 16) W[t] = words[i + t] | 0;
      else W[t] = rotateLeft(W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16], 1);

      let temp;
      if (t < 20) temp = (rotateLeft(A, 5) + ((B & C) | (~B & D)) + E + W[t] + 0x5a827999) | 0;
      else if (t < 40) temp = (rotateLeft(A, 5) + (B ^ C ^ D) + E + W[t] + 0x6ed9eba1) | 0;
      else if (t < 60) temp = (rotateLeft(A, 5) + ((B & C) | (B & D) | (C & D)) + E + W[t] + 0x8f1bbcdc) | 0;
      else temp = (rotateLeft(A, 5) + (B ^ C ^ D) + E + W[t] + 0xca62c1d6) | 0;

      E = D; D = C; C = rotateLeft(B, 30); B = A; A = temp;
    }
    H0 = (H0 + A) | 0; H1 = (H1 + B) | 0; H2 = (H2 + C) | 0; H3 = (H3 + D) | 0; H4 = (H4 + E) | 0;
  }
  return (cvtHex(H0) + cvtHex(H1) + cvtHex(H2) + cvtHex(H3) + cvtHex(H4)).toLowerCase();
}

// Upload file directly to Cloudinary using signed API authentication & progress tracking
export function uploadToCloudinary(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const toSign = `timestamp=${timestamp}${CLOUDINARY_CONFIG.apiSecret}`;
      const signature = sha1(toSign);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', CLOUDINARY_CONFIG.apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);

      const isVideo = file.type.startsWith('video/');
      const endpoint = isVideo ? 'video/upload' : 'image/upload';

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${CLOUDINARY_CONFIG.baseUrl}/${endpoint}`);

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            if (res.secure_url) {
              resolve(res.secure_url);
            } else {
              reject(new Error('No secure_url returned from Cloudinary'));
            }
          } catch (err) {
            reject(err);
          }
        } else {
          try {
            const errRes = JSON.parse(xhr.responseText);
            reject(new Error(errRes.error?.message || `Upload failed (${xhr.status})`));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error uploading to Cloudinary'));
      };

      xhr.send(formData);
    } catch (err) {
      reject(err);
    }
  });
}
