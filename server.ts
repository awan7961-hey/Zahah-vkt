import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
// @ts-ignore
import { attachExpressServer, startWhatsAppBot } from "./index.cjs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Safely attach Express REST endpoints
  try {
    attachExpressServer(app);
  } catch (err: any) {
    console.error("⚠️ Error attaching bot API routes:", err?.message || err);
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`=======================================================`);
    console.log(`🚀 BOSS-MD Server running on http://0.0.0.0:${PORT}`);
    console.log(`=======================================================`);
  });

  // Launch WhatsApp Bot engine asynchronously in background
  if (startWhatsAppBot) {
    setTimeout(() => {
      startWhatsAppBot().catch((err: any) => {
        console.error("⚠️ WhatsApp Bot engine startup notice:", err?.message || err);
      });
    }, 500);
  }
}

startServer().catch((err) => {
  console.error("❌ Critical server startup error:", err);
});
