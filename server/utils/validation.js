const { z } = require("zod");

const coordinate = z.number().int().min(0).max(1000);

const modelOutputSchema = z.object({
  objects: z.array(z.object({
    name: z.string().min(1).max(200),
    condition: z.enum(["damaged", "no_visible_damage", "uncertain"]),
    reason: z.string().max(2000),
    box: z.tuple([
      coordinate,
      coordinate,
      coordinate,
      coordinate
    ]).refine(
      ([ymin, xmin, ymax, xmax]) => ymax > ymin && xmax > xmin,
      "Invalid bounding box"
    )
  })).max(200)
});

module.exports = { modelOutputSchema };
