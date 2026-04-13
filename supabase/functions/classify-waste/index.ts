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
            content: `You are an expert waste classification AI. Analyze images of waste and classify them.
You must respond by calling the classify_waste function with your analysis results.
- wet_percent: percentage of wet/organic waste (0-100)
- dry_percent: percentage of dry/inorganic waste (0-100, must equal 100 - wet_percent)
- dominant: "Wet Waste" or "Dry Waste"
- waste_types: array of detected waste types with name, category (biodegradable/non-biodegradable), and suggestion (compost/animal_feed/recycling/landfill)
Be accurate and realistic in your assessment.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this waste image and classify it into wet vs dry waste percentages. Also identify specific waste types." },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_waste",
              description: "Classify waste from an image into wet/dry percentages and waste types",
              parameters: {
                type: "object",
                properties: {
                  wet_percent: { type: "number", description: "Percentage of wet waste (0-100)" },
                  dry_percent: { type: "number", description: "Percentage of dry waste (0-100)" },
                  dominant: { type: "string", enum: ["Wet Waste", "Dry Waste"] },
                  waste_types: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Name of detected waste item" },
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
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI classification failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI did not return classification results" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
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
