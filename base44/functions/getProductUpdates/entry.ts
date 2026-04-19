import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Polling endpoint — client machines call this every 30s to get latest products
// Returns: { products: [...], last_updated: ISO string, version: number }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Public endpoint — no auth required for client kiosk machines
    const products = await base44.asServiceRole.entities.Product.list('-updated_date', 200);

    const activeProducts = products.filter(p => p.in_stock !== false);

    const lastUpdated = products.length > 0
      ? products.reduce((latest, p) => {
          const d = new Date(p.updated_date || p.created_date);
          return d > latest ? d : latest;
        }, new Date(0))
      : new Date();

    // Simple version hash based on count + last update time
    const version = `${products.length}_${lastUpdated.getTime()}`;

    return Response.json({
      success: true,
      products: activeProducts,
      total: products.length,
      last_updated: lastUpdated.toISOString(),
      version,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});