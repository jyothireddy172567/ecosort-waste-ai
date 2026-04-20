import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Extract mime type and raw base64 from data URL
    let mimeType = "image/jpeg";
    let rawBase64 = imageBase64;
    
    if (imageBase64.startsWith("data:")) {
      const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/s);
      if (match) {
        mimeType = match[1];
        rawBase64 = match[2];
      } else {
        // Fallback: strip the prefix
        rawBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: `You are an expert waste classification AI specializing in Indian household waste segregation. You analyze images and accurately split waste into WET (organic/biodegradable) vs DRY (inorganic/recyclable) categories.

=== WET WASTE (organic, biodegradable, compostable) ===
- ALL food: cooked food, rice, roti, dal, curry, noodles, bread, leftovers
- Fruit peels & cores: banana peel, apple core, orange peel, mango skin, watermelon rind
- Vegetable waste: onion skin, potato peel, tomato, carrot tops, leafy scraps
- Tea bags, coffee grounds, used tea leaves
- Egg shells, meat scraps, fish bones, bones
- Dairy: milk, curd, paneer, cheese
- Garden waste: flowers, leaves, grass, twigs, plant trimmings

=== DRY WASTE (inorganic, recyclable, non-biodegradable) ===
- Plastic: bottles, bags, wrappers, containers, straws, cutlery
- Paper & cardboard: newspaper, boxes, cartons, magazines, tissue
- Metal: cans, foil, tins, scrap metal
- Glass: bottles, jars, broken glass
- Packaging: chip bags, candy wrappers, blister packs
- Other: rubber, cloth, fabric, ceramics, thermocol, styrofoam, e-waste

=== CRITICAL ANALYSIS RULES ===
1. LOOK CAREFULLY at every item visible. Examine colors, textures, shapes.
2. Identify EACH item separately and classify it.
3. Estimate percentages by VISUAL AREA/VOLUME the items occupy.
4. DO NOT default to dry waste. Look for organic matter:
   - Brown/yellow/green soft items = likely wet (food/peels)
   - Shiny/colorful packaging = likely dry
   - Both present? → split percentages accordingly.
5. Examples of EXPECTED outputs:
   - Banana peel only → wet_percent: 100, dry_percent: 0
   - Plastic bottle only → wet_percent: 0, dry_percent: 100
   - Plate of leftover food → wet_percent: 95, dry_percent: 5
   - Apple + plastic wrapper → wet_percent: 60, dry_percent: 40
   - Newspaper with tea leaves → wet_percent: 30, dry_percent: 70
6. If image is unclear/blurry, still make your BEST estimate based on visible cues. NEVER default to 0/100 unless you genuinely see only one type.
7. EXHAUSTIVE DETECTION: List EVERY distinct waste item you can see in waste_types — do not skip items. If you see 6 items, return 6 entries. If you see 10, return 10. Be thorough.
8. Use specific names (e.g. "banana peel", "PET plastic bottle", "newspaper", "onion skin") — never generic terms like "waste" or "trash".

You MUST call the classify_waste function with accurate, balanced, COMPLETE results listing every visible item.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this waste image carefully. Look at every item: identify food/organic matter (wet) AND packaging/plastic/paper (dry). Estimate realistic percentages by visual area. Do NOT default to 100% dry - if you see ANY organic matter (food, peels, leaves), assign it appropriate wet percentage. List the specific items you detect." },
              { 
                type: "image_url", 
                image_url: { 
                  url: `data:${mimeType};base64,${rawBase64}` 
                } 
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_waste",
              description: "Classify waste from an image into wet/dry percentages and identified waste types",
              parameters: {
                type: "object",
                properties: {
                  wet_percent: { type: "number", description: "Percentage of wet/organic waste (0-100). Food waste should be 70-100%." },
                  dry_percent: { type: "number", description: "Percentage of dry/inorganic waste (0-100). Must equal 100 - wet_percent." },
                  dominant: { type: "string", enum: ["Wet Waste", "Dry Waste"], description: "Which type dominates the image" },
                  waste_types: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Name of detected waste item e.g. banana peel, plastic bottle" },
                        category: { type: "string", enum: ["biodegradable", "non-biodegradable"] },
                        suggestion: { type: "string", enum: ["compost", "animal_feed", "recycling", "landfill"] },
                      },
                      required: ["name", "category", "suggestion"],
                    },
                  },
                },
                required: ["wet_percent", "dry_percent", "dominant", "waste_types"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "classify_waste" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI classification failed. Please try a different image." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      // Fallback: try to parse from content
      const content = data.choices?.[0]?.message?.content;
      console.error("No tool call returned. Content:", content);
      return new Response(JSON.stringify({ error: "AI did not return classification results. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log("AI classification result:", JSON.stringify(result));
    
    // Validate and normalize
    result.wet_percent = Math.max(0, Math.min(100, Math.round(result.wet_percent)));
    result.dry_percent = 100 - result.wet_percent;
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("classify-waste error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
