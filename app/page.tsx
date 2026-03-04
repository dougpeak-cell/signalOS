export default function HomePage() {
  return (
    <main style={{ fontFamily: "system-ui", padding: 48, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 44, margin: 0 }}>SignalOS</h1>

      <p style={{ marginTop: 16, fontSize: 18, lineHeight: 1.6 }}>
        SignalOS is a subscription platform for AI-powered stock analysis, conviction scores, and portfolio analytics.
      </p>

      <p style={{ marginTop: 12, fontSize: 14, opacity: 0.8, lineHeight: 1.6 }}>
        SignalOS provides financial analytics tools and does not provide investment advice or execute trades.
      </p>

      <p style={{ marginTop: 18, fontSize: 16 }}>
        Contact: <a href="mailto:support@signalos.app">support@signalos.app</a>
      </p>
    </main>
  );
}
