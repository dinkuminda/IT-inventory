import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://wshzrohkcjgemxnwjivp.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log('Initializing ICS IT Admin Server (Supabase)...');
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('WARNING: SUPABASE_SERVICE_ROLE_KEY is not set. Administrative actions (user management, asset saving) will fail.');
  } else {
    console.log('Supabase Service Role Key is configured.');
  }

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  app.get("/api/health", async (req, res) => {
    let supabaseStatus = "not_configured";
    let assetsTableStatus = "unknown";
    
    if (supabaseAdmin) {
      try {
        const { error } = await supabaseAdmin.from('assets').select('id').limit(1);
        if (error) {
          supabaseStatus = "error";
          assetsTableStatus = error.message;
        } else {
          supabaseStatus = "ok";
          assetsTableStatus = "ok";
        }
      } catch (e: any) {
        supabaseStatus = "exception";
        assetsTableStatus = e.message;
      }
    }

    res.json({ 
      status: "ok", 
      supabaseConfigured: !!supabaseAdmin,
      supabaseStatus,
      assetsTableStatus,
      env: process.env.NODE_ENV,
      time: new Date().toISOString()
    });
  });

  // Admin User Creation Endpoint
  app.post("/api/admin/create-user", async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: "Supabase Service Role Key not configured" });
    const { email, password, fullName, department } = req.body;

    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      });

      if (authError) throw authError;

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert([{
          id: authData.user.id,
          email,
          displayName: fullName,
          department: department || 'IT Department',
          role: 'employee',
          needsPasswordChange: true
        }], { onConflict: 'id' });

      if (profileError) throw profileError;

      res.json({ success: true, user: authData.user });
    } catch (error: any) {
      console.error('Error creating user:', error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/admin/update-user", async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: "Supabase Service Role Key not configured" });
    const { id, fullName, department, role } = req.body;
    try {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ displayName: fullName, department, role })
        .eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/admin/delete-user", async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: "Supabase Service Role Key not configured" });
    const { id } = req.body;
    try {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (authError) throw authError;
      const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', id);
      if (profileError) throw profileError;
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/admin/reset-password", async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: "Supabase Service Role Key not configured" });
    const { id, newPassword } = req.body;
    try {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, { password: newPassword });
      if (authError) throw authError;
      const { error: profileError } = await supabaseAdmin.from('profiles').update({ needsPasswordChange: true }).eq('id', id);
      if (profileError) throw profileError;
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Asset Endpoints
  app.post("/api/assets/save", async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: "Supabase Service Role Key not configured" });
    const { assetId, payload } = req.body;
    try {
      if (Array.isArray(payload)) {
        // Bulk import
        const { error } = await supabaseAdmin.from('assets').insert(payload);
        if (error) throw error;
      } else if (assetId) {
        // Update existing
        const { error } = await supabaseAdmin.from('assets').update(payload).eq('id', assetId);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabaseAdmin.from('assets').insert([payload]);
        if (error) throw error;
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error saving asset:', error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/assets/update", async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: "Supabase Service Role Key not configured" });
    const { id, updates, payload } = req.body;
    try {
      const { error } = await supabaseAdmin.from('assets').update(updates || payload).eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating asset:', error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/assets/delete", async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: "Supabase Service Role Key not configured" });
    const { id } = req.body;
    try {
      const { error } = await supabaseAdmin.from('assets').delete().eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting asset:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // License Endpoints
  app.post("/api/licenses/save", async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: "Supabase Service Role Key not configured" });
    const { licenseId, payload } = req.body;
    try {
      if (Array.isArray(payload)) {
        // Bulk import
        const { error } = await supabaseAdmin.from('licenses').insert(payload);
        if (error) throw error;
      } else if (licenseId) {
        // Update existing
        const { error } = await supabaseAdmin.from('licenses').update(payload).eq('id', licenseId);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabaseAdmin.from('licenses').insert([payload]);
        if (error) throw error;
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error saving license:', error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/licenses/delete", async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: "Supabase Service Role Key not configured" });
    const { id } = req.body;
    try {
      const { error } = await supabaseAdmin.from('licenses').delete().eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting license:', error);
      res.status(400).json({ error: error.message });
    }
  });

  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API route not found" });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is listening on 0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
