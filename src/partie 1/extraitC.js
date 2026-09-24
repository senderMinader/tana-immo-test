// Supposons que l'on a le schema Zod 
// import { paymentWebhookSchema } from './schemas/webhookSchema.js';

app.post("/webhooks/payment", express.json(), async (req, res) => {
  try {
    //Simule une verification de signature
    const isValid = verifySignature(req, process.env.WEBHOOK_SECRET);
    if (!isValid) return res.status(401).send("Signature invalide");

    const result = paymentWebhookSchema.safeParse(req.body);
  
    if (!result.success) {
      const errorMessages = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      console.error("[Webhook] Erreur de validation:", errorMessages);
      return res.status(400).json({
        error: "Données invalides",
        details: errorMessages
      });
    }

    const event = result.data;
    //IDEMPOTENCE - SUGGEREE PAR L'IA
    // On suppose que l'on a une table webhook_logs pour enregistrer les événements traités
    // CREATE TABLE webhook_logs (
    // event_id VARCHAR(255) PRIMARY KEY,
    // payload JSONB NOT NULL,
    // status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    // created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    // processed_at TIMESTAMP NULL
    // );

    const insertResult = await db.query(
      `INSERT INTO webhook_logs (event_id, payload, status) 
       VALUES ($1, $2, 'pending') 
       ON CONFLICT (event_id) DO NOTHING 
       RETURNING event_id`,
      [event.id, JSON.stringify(event)]
    );
    if (insertResult.rowCount === 0) return res.status(200).send("ok");

    if (event.type === "payment.succeeded") {
      //TRAITEMENT ASYNCHRONE
      // On ajoute la mise à jour de la table bookings, l'envoi du mail et l'appel du CRM dans une file d'attente
      await queue.add('process-payment-success', {
        eventId: event.id,
        bookingId: event.booking_id,
        email: event.customer_email,
        eventData: event
      });

      return;
    }

    res.status(200).send("ok");

  } catch (error) {
    console.error("[Webhook] Erreur non gérée :", error.message);
    res.status(500).send("Erreur interne du serveur");
  }
});

// worker.js (traitement du file d'attente en arrière-plan)
async function processPendingWebhooks() {
  // 1. Récupérer les événements 'pending' (avec un verrou FOR UPDATE SKIP LOCKED pour éviter que 2 workers ne traitent la même ligne)
  const { rows } = await db.query(`
    UPDATE webhook_logs 
    SET status = 'processing' 
    WHERE status = 'pending' 
    ORDER BY created_at ASC 
    LIMIT 10 
    RETURNING event_id, payload
  `);

  for (const item of rows) {
    const event = item.payload;
    try {
      // 2. Exécuter la logique métier (UPDATE bookings, etc.)
      await db.query("UPDATE bookings SET status = 'paid' WHERE id = $1", [event.booking_id]);
      
      // 3. Marquer comme terminé
      await db.query(
        "UPDATE webhook_logs SET status = 'completed', processed_at = NOW() WHERE event_id = $1",
        [item.event_id]
      );
    } catch (error) {
      // 4. En cas d'échec, marquer comme 'failed' pour investigation manuelle ou retry ultérieur
      console.error(`Échec traitement webhook ${item.event_id}:`, error);
      await db.query(
        "UPDATE webhook_logs SET status = 'failed' WHERE event_id = $1",
        [item.event_id]
      );
    }
  }
}