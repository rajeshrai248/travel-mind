import express from "express";
import type { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");
import multer from "multer";
import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const upload = multer({ storage: multer.memoryStorage() });

// Initialize Firebase Admin
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) as ServiceAccount;
  initializeApp({ credential: cert(serviceAccount) });
}

// Auth middleware — verifies Firebase ID token from Authorization header
async function authenticateRequest(req: Request, res: Response, next: NextFunction) {
  // Skip auth if Firebase Admin is not configured (local dev without Firebase)
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const token = authHeader.split("Bearer ")[1];
    const decoded = await getAuth().verifyIdToken(token);
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: PDF Parsing (protected)
  app.post("/api/parse-ticket", authenticateRequest, upload.single("ticket"), async (req, res) => {
    console.log("[parse-ticket] Request received");
    try {
      if (!req.file) {
        console.log("[parse-ticket] No file in request");
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log("[parse-ticket] File received:", req.file.originalname, req.file.size, "bytes");
      const pdfDoc = new PDFParse({ data: new Uint8Array(req.file.buffer) });
      console.log("[parse-ticket] PDFParse instance created, loading...");
      await pdfDoc.load();
      console.log("[parse-ticket] PDF loaded, extracting text...");
      const result = await pdfDoc.getText();
      await pdfDoc.destroy();
      console.log("[parse-ticket] getText result type:", typeof result);
      console.log("[parse-ticket] getText result keys:", result && typeof result === 'object' ? Object.keys(result) : result);
      const text = typeof result === 'string' ? result : result?.text ?? JSON.stringify(result);
      console.log("[parse-ticket] Text extracted, length:", text?.length);
      res.json({ text });
    } catch (error) {
      console.error("[parse-ticket] Error:", error);
      res.status(500).json({ error: "Failed to parse PDF" });
    }
  });

  // API Route: Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
