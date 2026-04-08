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

  console.log('Initializing ICS IT Admin Server...');
  console.log('NODE_ENV:', process.env.NODE_ENV);

  // Increase JSON limit for bulk imports
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Request logging - MUST be before routes
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      console.log('Request Body Keys:', Object.keys(req.body || {}));
    }
    next();
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      supabaseConfigured: !!supabaseAdmin,
      env: process.env.NODE_ENV,
      time: new Date().toISOString()
    });
  });

  // Admin User Creation Endpoint
  app.post("/api/admin/create-user", async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Supabase Service Role Key not configured" });
    }

    const { email, password, fullName, department } = req.body;

    try {
      // 1. Create the user in Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      });

      if (authError) throw authError;

      // 2. Create or update the profile with needsPasswordChange flag
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
      res.status(error.status || 400).json({ 
        error: error.message || "An unexpected error occurred",
        details: error
      });
    }
  });

  // Admin User Update Endpoint
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

  // Admin User Delete Endpoint
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

  // Admin User Reset Password Endpoint
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

  // Asset Management Endpoints (Bypass RLS)
  app.post("/api/assets/save", async (req, res) => {
    console.log('POST /api/assets/save hit');
    if (!supabaseAdmin) {
      console.error('Supabase Admin not initialized');
      return res.status(500).json({ error: "Supabase Service Role Key not configured" });
    }
    const { assetId, payload } = req.body;
    try {
      if (assetId) {
        // Update single
        const { error } = await supabaseAdmin
          .from('assets')
          .update(payload)
          .eq('id', assetId);
        if (error) throw error;
      } else if (Array.isArray(payload)) {
        // Bulk Insert
        const { error } = await supabaseAdmin
          .from('assets')
          .insert(payload);
        if (error) throw error;
      } else {
        // Single Insert
        const { error } = await supabaseAdmin
          .from('assets')
          .insert([payload]);
        if (error) throw error;
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error saving asset via server:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Generic Asset Update (for approvals, etc)
  app.post("/api/assets/update", async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: "Supabase Service Role Key not configured" });
    const { id, updates } = req.body;
    try {
      const { error } = await supabaseAdmin
        .from('assets')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Asset Delete Endpoint (Bypass RLS)
  app.post("/api/assets/delete", async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: "Supabase Service Role Key not configured" });
    const { id } = req.body;
    try {
      const { error } = await supabaseAdmin
        .from('assets')
        .delete()
        .eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting asset via server:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // License Management Endpoints (Bypass RLS)
  app.post("/api/licenses/save", async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: "Supabase Service Role Key not configured" });
    const { licenseId, payload } = req.body;
    try {
      if (licenseId) {
        const { error } = await supabaseAdmin
          .from('licenses')
          .update(payload)
          .eq('id', licenseId);
        if (error) throw error;
      } else if (Array.isArray(payload)) {
        const { error } = await supabaseAdmin
          .from('licenses')
          .insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabaseAdmin
          .from('licenses')
          .insert([payload]);
        if (error) throw error;
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/licenses/delete", async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: "Supabase Service Role Key not configured" });
    const { id } = req.body;
    try {
      const { error } = await supabaseAdmin
        .from('licenses')
        .delete()
        .eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Catch-all for undefined API routes
  app.all("/api/*", (req, res) => {
    console.log(`404 API Fallthrough: ${req.method} ${req.url}`);
    res.status(404).json({ 
      error: "API route not found",
      method: req.method,
      url: req.url
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log('Initializing Vite middleware...');
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log('Vite middleware initialized successfully');
    } catch (error) {
      console.error('Error initializing Vite middleware:', error);
    }
  } else {
    console.log('Running in production mode, serving static files...');
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
