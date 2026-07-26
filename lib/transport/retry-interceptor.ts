export async function fetchWithRetry(
  endpoint: string,
  options: RequestInit,
  retries = 2,
  backoffMs = 300
): Promise<Response> {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      const response = await fetch(endpoint, options);
      if (response.status < 500 || attempt === retries) {
        return response;
      }
    } catch (err) {
      if (attempt === retries) throw err;
    }
    attempt++;
    await new Promise((res) => setTimeout(res, backoffMs * Math.pow(2, attempt)));
  }
  return fetch(endpoint, options);
}
