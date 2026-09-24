app.get("/api/listings", async (req, res) => {
  try {
    const { city, page, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const sql = `
    SELECT 
      l.*,
      a.id AS agency_id, a.name AS agency_name, a.address AS agency_address, a.phone AS agency_phone,
      p.url AS photo_url
    FROM listings l
    LEFT JOIN agencies a ON l.agency_id = a.id
    LEFT JOIN photos p ON l.id = p.listing_id
    WHERE l.city = $1
    ORDER BY l.created_at DESC
    LIMIT $2 OFFSET $3
  `;

    const result = await db.query(sql, [city, limit, offset]);

    // Restructuration des données aplaties en JSON imbriqué
    const listingsMap = new Map();
    for (const row of result.rows) {
      if (!listingsMap.has(row.id)) {
        listingsMap.set(row.id, {
          id: row.id,
          title: row.title,
          price: row.price,
          city: row.city,
          created_at: row.created_at,
          agency: row.agency_id
            ? {
                id: row.agency_id,
                name: row.agency_name,
                address: row.agency_address,
                phone: row.agency_phone,
              }
            : null,
          photos: [],
        });
      }
      if (row.photo_url) {
        listingsMap.get(row.id).photos.push({ url: row.photo_url });
      }
    }

    const resJSON = Array.from(listingsMap.values());
    res.json(resJSON);
  } catch (error) {
    console.error("Error fetching listings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});