const express = require("express");
const sharp = require("sharp");
const Inspection = require("../models/Inspection");
const upload = require("../config/multer");
const { modelOutputSchema } = require("../utils/validation");

const router = express.Router();

router.post("/inspect", upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "An image is required." });
    }

    let image;
    try {
      image = await sharp(req.file.buffer, {
        limitInputPixels: 40_000_000
      })
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: "inside",
          withoutEnlargement: true
        })
        .jpeg({ quality: 90 })
        .toBuffer();
    } catch {
      return res.status(400).json({ error: "Invalid or oversized image." });
    }

    const workspace = encodeURIComponent(process.env.ROBOFLOW_WORKSPACE);
    const workflow = encodeURIComponent(process.env.ROBOFLOW_WORKFLOW);

    const workflowUrl = `https://serverless.roboflow.com/${workspace}/workflows/${workflow}`;

    const upstream = await fetch(workflowUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ROBOFLOW_API_KEY}`
      },
      body: JSON.stringify({
        inputs: {
          image: {
            type: "base64",
            value: image.toString("base64")
          }
        }
      }),
      signal: AbortSignal.timeout(120000)
    });

    if (!upstream.ok) {
      console.error("Roboflow HTTP status:", upstream.status);
      return res.status(502).json({
        error: "Inspection service failed. Check Workflow access and configuration."
      });
    }

    const payload = await upstream.json();
    const result = Array.isArray(payload)
      ? payload[0]
      : Array.isArray(payload?.outputs)
        ? payload.outputs[0]
        : undefined;

    if (!result || typeof result !== "object" || Array.isArray(result)) {
      console.error("Unexpected Roboflow response shape:", {
        topLevelType: Array.isArray(payload) ? "array" : typeof payload,
        topLevelKeys: payload && !Array.isArray(payload) ? Object.keys(payload) : [],
        outputCount: Array.isArray(payload?.outputs) ? payload.outputs.length : undefined
      });

      return res.status(502).json({
        error: "Inspection service returned no Workflow result."
      });
    }

    if (result.parse_error === true) {
      console.error("Workflow reported a JSON parse error.");
      return res.status(502).json({
        error: "Inspection model returned an invalid response."
      });
    }

    let validated;
    try {
      const candidate = result.objects !== undefined
        ? { objects: result.objects }
        : typeof result.inspection === "string"
          ? JSON.parse(
              result.inspection.trim()
                .replace(/^```(?:json)?\s*/i, "")
                .replace(/\s*```$/, "")
            )
          : undefined;

      validated = modelOutputSchema.parse(candidate);
    } catch (error) {
      console.error("Model output validation failed:", {
        availableFields: Object.keys(result),
        message: error.message
      });

      return res.status(502).json({
        error: "Inspection model returned an invalid response."
      });
    }

    const objects = validated.objects.map((object, index) => ({
      ...object,
      id: index + 1
    }));

    const counts = {
      total: objects.length,
      damaged: objects.filter((object) => object.condition === "damaged").length,
      noVisibleDamage: objects.filter((object) => object.condition === "no_visible_damage").length,
      uncertain: objects.filter((object) => object.condition === "uncertain").length
    };

    const saved = await Inspection.create({
      filename: req.file.originalname,
      counts,
      objects
    });

    return res.json({
      id: saved.id,
      counts,
      objects,
      image: `data:image/jpeg;base64,${image.toString("base64")}`
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
