const express=require("express");
const fetch=require("node-fetch");
const cors=require("cors");
const multer=require("multer");
const {PdfReader}=require("pdfreader");
require("dotenv").config({ override: true });

const app=express();
const upload=multer({storage:multer.memoryStorage()});
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve frontend files statically

async function askGroq(instruction, text) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("API Key is missing from .env file!");
  
  const prompt = `${instruction}\nOnly provide the final output without conversational filler or introductory statements.\n\nText:\n${text}`;
  
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }]
    })
  });
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Groq API Error");
  return data.choices[0].message.content.trim();
}

app.post("/extract-pdf", upload.single("file"), async(req, res) => {
  try {
    const buffer=req.file.buffer; let text=""; const reader=new PdfReader();
    await new Promise((resolve,reject)=>reader.parseBuffer(buffer,(err,item)=>{if(err)reject(err);else if(!item)resolve();else if(item.text)text+=item.text+" ";}));
    if(!text.trim()) return res.status(400).json({error:"No text found in PDF"});
    res.json({text:text.trim()});
  } catch(err) { res.status(500).json({error:"Failed to read PDF: "+err.message}); }
});

app.post("/summarize", async(req, res) => {
  const {text, outputLength, language, focusOn} = req.body;
  if(!text) return res.status(400).json({error:"No text provided"});
  try {
    const instruction = `Summarize the following text.\nTarget length/format: ${outputLength || "Short (3-5 sentences)"}.\nFocus primarily on: ${focusOn || "Main ideas"}.\nOutput Language: ${language || "English"}.`;
    const summary = await askGroq(instruction, text);
    res.json({summary});
  } catch(err) { res.status(500).json({error:"Server failed: "+err.message}); }
});

app.post("/elaborate", async(req, res) => {
  const {text, outputLength, language, focusOn} = req.body;
  if(!text) return res.status(400).json({error:"No text provided"});
  try {
    const instruction = `Elaborate on the following text. Expand the ideas, add clarity, and provide more detail.\nTarget length/format: ${outputLength || "Medium (1 paragraph)"}.\nFocus primarily on: ${focusOn || "Main ideas"}.\nOutput Language: ${language || "English"}.`;
    const elaboratedText = await askGroq(instruction, text);
    res.json({elaboratedText});
  } catch(err) { res.status(500).json({error:"Server failed: "+err.message}); }
});

app.post("/refine", async(req, res) => {
  const {text, action, value} = req.body;
  if(!text) return res.status(400).json({error:"No text provided"});
  try {
    let instruction = "Rewrite the following text to improve clarity and flow.";
    if (action === "tone") instruction = `Rewrite the following text strictly in a ${value} tone.`;
    else if (action === "format") instruction = `Format the following text strictly into ${value}.`;
    else if (action === "shorten") instruction = `Shorten the following text and make it extremely concise while preserving core meaning.`;
    else if (action === "elaborate") instruction = `Elaborate on the following text, expanding the ideas and providing more detail.`;
    else if (action === "language") instruction = `Translate the following text accurately into ${value}.`;
    else if (action === "regenerate") instruction = `Rewrite the following text to improve clarity, flow, and professionalism.`;
    
    const refinedText = await askGroq(instruction, text);
    res.json({refinedText});
  } catch(err) { res.status(500).json({error:"Server failed: "+err.message}); }
});

if (require.main === module) {
  app.listen(3000,()=>console.log("✅ Server running at http://localhost:3000"));
}
module.exports = app;
