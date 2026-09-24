// NB : ce test a été généré 100% par une IA, je ne maitrise pas encore le test unitaire de code React et j'ai utilisé l'IA pour ne pas perdre de temps.
// Après analyse du code généré, je pense pouvoir monter en compétence sur le test unitaire de code React en quelques semaines
const CrmClient = require("./crmClient");

describe("CrmClient.createLead", () => {
  const lead = {
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
  };

  let client;

  beforeEach(() => {
    jest.clearAllMocks();

    client = new CrmClient({
      baseUrl: process.env.BASE_URL || "https://crm.example.com",
      token: process.env.TOKEN || "test-token",

      // Important pour que le test "500 trois fois" fasse
      // exactement 3 appels : tentative initiale + 2 retries.
      maxRetries: 2,

      timeoutMs: 5000,

      // Permet de rendre l'Idempotency-Key déterministe.
      idempotenceKeyGenerator: jest.fn(() => "test-idempotency-key"),
    });

    // On ne veut pas réellement attendre pendant les tests.
    client.sleep = jest.fn().mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("429 puis succès", async () => {
    global.fetch = jest
      .fn()
      // Première tentative : Too Many Requests
      .mockResolvedValueOnce(
        new Response(null, {
          status: 429,
          headers: {
            "Retry-After": "1",
          },
        }),
      )
      // Deuxième tentative : succès
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "lead-123" }), {
          status: 201,
          headers: {
            "Content-Type": "application/json",
          },
        }),
      );

    const result = await client.createLead(lead);

    expect(result).toEqual({
      id: "lead-123",
    });

    // Initial + retry
    expect(global.fetch).toHaveBeenCalledTimes(2);

    // Le Retry-After: 1 doit provoquer un délai de 1000 ms
    expect(client.sleep).toHaveBeenCalledTimes(1);
    expect(client.sleep).toHaveBeenCalledWith(1000);

    // Vérification de la première requête
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      "https://crm.example.com/v1/leads",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
          "Idempotency-Key": "test-idempotency-key",
        }),
        body: JSON.stringify(lead),
      }),
    );

    // Vérification que le même Idempotency-Key est utilisé
    // lors du retry.
    const firstCallHeaders = global.fetch.mock.calls[0][1].headers;
    const secondCallHeaders = global.fetch.mock.calls[1][1].headers;

    expect(firstCallHeaders["Idempotency-Key"]).toBe(
      "test-idempotency-key",
    );

    expect(secondCallHeaders["Idempotency-Key"]).toBe(
      "test-idempotency-key",
    );
  });

  test("500 trois fois puis abandon", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 500,
        }),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 500,
        }),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 500,
        }),
      );

    await expect(client.createLead(lead)).rejects.toThrow(
      "Échec CRM après 3 tentatives. Dernière erreur: 500",
    );

    // 3 tentatives exactement :
    // 1 tentative initiale + 2 retries
    expect(global.fetch).toHaveBeenCalledTimes(3);

    // Backoff :
    // tentative 1 -> 1000 ms
    // tentative 2 -> 2000 ms
    expect(client.sleep).toHaveBeenNthCalledWith(1, 1000);
    expect(client.sleep).toHaveBeenNthCalledWith(2, 2000);

    expect(client.sleep).toHaveBeenCalledTimes(2);
  });
});