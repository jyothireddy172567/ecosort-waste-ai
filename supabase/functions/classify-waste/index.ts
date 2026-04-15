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
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert waste classification AI. Analyze images of waste and classify them into wet (organic/biodegradable) and dry (inorganic/non-biodegradable) categories.

IMPORTANT classification rules:
- Wet Waste (organic/biodegradable): food scraps, fruit peels, vegetable waste, leftover cooked food, tea bags, coffee grounds, garden waste, flowers, leaves, egg shells, meat, fish, dairy products, bread, rice, noodles
- Dry Waste (inorganic/non-biodegradable): plastic bottles, paper, cardboard, metal cans, glass, plastic bags, packaging, electronic waste, rubber, cloth/fabric, ceramics, thermocol, styrofoam, aluminum foil

When analyzing:
- Look carefully at ALL items in the image
- Estimate the proportion of wet vs dry waste by volume/area
- Most real-world waste images contain BOTH wet and dry waste
- Food waste images should have HIGH wet_percent (70-100%)
- Plastic/paper/packaging images should have HIGH dry_percent (70-100%)
- Mixed waste should have balanced percentages

You MUST call the classify_waste function with your results.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this waste image. Identify all waste items, classify each as wet or dry, and provide overall percentages. Be realistic - most waste has both wet and dry components." },
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
