export type UploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};

export function uploadToGcsResumableSession(opts: {
  sessionUrl: string;
  file: File;
  onProgress?: (p: UploadProgress) => void;
  onProgressBytes?: (uploadedBytes: number) => void;
}): { promise: Promise<void>; cancel: () => void } {
  const { sessionUrl, file, onProgress, onProgressBytes } = opts;
  const xhr = new XMLHttpRequest();

  const promise = new Promise<void>((resolve, reject) => {
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const percent = Math.round((e.loaded / e.total) * 100);
      onProgress?.({ loaded: e.loaded, total: e.total, percent });
      onProgressBytes?.(e.loaded);
    };

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));

    xhr.onreadystatechange = () => {
      // Success for resumable single-shot PUT generally returns 200 or 201
      if (xhr.readyState === 4) {
        if (xhr.status === 200 || xhr.status === 201) resolve();
        else reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`));
      }
    };

    xhr.open("PUT", sessionUrl, true);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("Content-Range", `bytes 0-${file.size - 1}/${file.size}`);

    xhr.send(file);
  });

  return {
    promise,
    cancel: () => xhr.abort(),
  };
}
