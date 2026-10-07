export async function requestDso<T>(body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  try {
    const response = await fetch("/api/omgevingswet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(35000)]) : AbortSignal.timeout(35000) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Het Omgevingsloket kan dit verzoek nu niet verwerken.");
    return data as T;
  } catch (error) {
    if (error instanceof Error && ["TimeoutError", "TypeError", "SyntaxError"].includes(error.name)) throw new Error("De verbinding is onderbroken. Uw antwoorden zijn behouden. Probeer het opnieuw.");
    throw error;
  }
}
