import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Client kiosk machines poll this endpoint to get their latest command
// Usage: POST { table_id: "PC1", last_version: "optional_last_known_version" }
// Returns command if new version available, or { no_change: true }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { table_id, last_version } = body;

    if (!table_id) {
      return Response.json({ error: 'table_id məcburidir' }, { status: 400 });
    }

    // Get latest products to compute version
    const products = await base44.asServiceRole.entities.Product.list('-updated_date', 200);

    const lastUpdated = products.length > 0
      ? products.reduce((latest, p) => {
          const d = new Date(p.updated_date || p.created_date);
          return d > latest ? d : latest;
        }, new Date(0))
      : new Date();

    const version = `${products.length}_${lastUpdated.getTime()}`;

    // If client already has this version, no action needed
    if (last_version && last_version === version) {
      return Response.json({ no_change: true, version });
    }

    // Build command for this table
    const command = {
      cmd: 'RELOAD_MENU',
      table_id,
      version,
      timestamp: new Date().toISOString(),
      products_count: products.filter(p => p.in_stock !== false).length,
    };

    // Base64 encode the command
    const commandJson = JSON.stringify(command);
    const encoded = btoa(unescape(encodeURIComponent(commandJson)));

    return Response.json({
      success: true,
      has_command: true,
      version,
      command,
      command_b64: encoded,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});