class CrmClient {
  constructor({
    baseUrl,
    token,
    maxRetries = 3,
    timeoutMs = 5000,
    idempotenceKeyGenerator = null,
  }) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.maxRetries = maxRetries;
    this.timeoutMs = timeoutMs;
    this.generateIdempotencyKey =
      idempotenceKeyGenerator || (() => crypto.randomUUID());
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

async createLead(leadData) {
  const idempotencyKey = this.generateIdempotencyKey();

  let lastError;

  for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
    const controller = new AbortController();

    const timeoutId = setTimeout(
      () => controller.abort(),
      this.timeoutMs,
    );

    let response;

    try {
      response = await fetch(`${this.baseUrl}/v1/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(leadData),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);

      // Timeout
      if (error.name === "AbortError") {
        lastError = new Error("CRM Timeout (5s dépassées)");

        if (attempt === this.maxRetries) {
          throw new Error(
            "Échec CRM : Timeout après toutes les tentatives",
          );
        }

        const delayMs = 1000 * Math.pow(2, attempt);

        console.warn(
          `[CRMClient] Timeout tentative ${attempt + 1}. Nouvelle tentative dans ${delayMs}ms.`,
        );

        await this.sleep(delayMs);
        continue;
      }

      lastError = error;

      if (attempt === this.maxRetries) {
        throw lastError;
      }

      const delayMs = 1000 * Math.pow(2, attempt);

      console.warn(
        `[CRMClient] Erreur réseau tentative ${attempt + 1}. Nouvelle tentative dans ${delayMs}ms.`,
      );

      await this.sleep(delayMs);
      continue;
    }

    clearTimeout(timeoutId);

    if (response.ok) {
      return await response.json();
    }

    // Erreurs définitives
    if (
      response.status === 400 ||
      response.status === 401 ||
      response.status === 403
    ) {
      throw new Error(
        `CRM Erreur définitive (Status: ${response.status}). Vérifiez les données ou le token.`,
      );
    }

    // Erreurs temporaires
    if (response.status === 429 || response.status >= 500) {
      lastError = new Error(
        `CRM Erreur temporaire (Status: ${response.status})`,
      );

      if (attempt === this.maxRetries) {
        throw new Error(
          `Échec CRM après ${this.maxRetries + 1} tentatives. Dernière erreur: ${response.status}`,
        );
      }

      const retryAfterHeader =
        response.headers.get("Retry-After");

      let delayMs = 1000 * Math.pow(2, attempt);

      if (response.status === 429 && retryAfterHeader) {
        delayMs = parseInt(retryAfterHeader, 10) * 1000;
      }

      console.warn(
        `[CRMClient] Échec tentative ${attempt + 1}/${this.maxRetries + 1} (Status: ${response.status}). Nouvelle tentative dans ${delayMs}ms.`,
      );

      await this.sleep(delayMs);

      continue;
    }

    // Autres codes HTTP
    throw new Error(
      `CRM Erreur inattendue (Status: ${response.status})`,
    );
  }

  throw lastError;
}
}

module.exports = CrmClient;
