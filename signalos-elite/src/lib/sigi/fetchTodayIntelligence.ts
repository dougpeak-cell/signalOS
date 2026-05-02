export async function fetchTodayIntelligence(payload: unknown) {
  try {
    const response = await fetch("/api/sigi/today-intelligence", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}