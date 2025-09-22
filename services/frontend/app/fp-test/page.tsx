"use client";
import { useVisitorData } from "@fingerprintjs/fingerprintjs-pro-react";

export default function FingerprintTestPage() {
  const { isLoading, error, data, getData } = useVisitorData(
    { extendedResult: true },
    { immediate: true }
  );

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Fingerprint Test</h1>

      <button onClick={() => getData({ ignoreCache: true })}>
        Refresh Fingerprint
      </button>

      <p>
        <strong>Visitor ID:</strong>{" "}
        {isLoading ? "Loading..." : data?.visitorId}
      </p>

      <h2>Full Visitor Data</h2>
      <pre style={{ background: "#f4f4f4", padding: "1rem" }}>
        {error ? error.message : JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
