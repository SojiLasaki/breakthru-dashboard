import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_MODEL = "google/gemini-3-flash-preview";

const getProviderConfig = (provider?: string) => {
  const selected = (provider || "lovable").toLowerCase();
  if (selected === "ollama") {
    return {
      gateway: Deno.env.get("OLLAMA_GATEWAY_URL") || "http://localhost:11434/v1/chat/completions",
      key: Deno.env.get("OLLAMA_API_KEY") || "",
      model: Deno.env.get("OLLAMA_DEFAULT_MODEL") || "llama3.1:8b",
    };
  }
  if (selected === "vllm") {
    return {
      gateway: Deno.env.get("VLLM_GATEWAY_URL") || "http://localhost:8001/v1/chat/completions",
      key: Deno.env.get("VLLM_API_KEY") || "",
      model: Deno.env.get("VLLM_DEFAULT_MODEL") || "meta-llama/Llama-3.1-8B-Instruct",
    };
  }
  if (selected === "lmstudio") {
    return {
      gateway: Deno.env.get("LMSTUDIO_GATEWAY_URL") || "http://localhost:1234/v1/chat/completions",
      key: Deno.env.get("LMSTUDIO_API_KEY") || "",
      model: Deno.env.get("LMSTUDIO_DEFAULT_MODEL") || "local-model",
    };
  }
  return {
    gateway: Deno.env.get("LOVABLE_GATEWAY_URL") || "https://ai.gateway.lovable.dev/v1/chat/completions",
    key: Deno.env.get("LOVABLE_API_KEY") || "",
    model: DEFAULT_MODEL,
  };
};

const trimContext = (value: unknown, limit = 16000) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed.length <= limit) return trimmed;
  return `${trimmed.slice(0, limit)}\n\n[Context truncated]`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, provider, model, context, mcp_adapters } = await req.json();
    const providerConfig = getProviderConfig(provider);
    if (!providerConfig.key && providerConfig.gateway.includes("gateway.lovable.dev")) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const contextBlock = trimContext(context);
    const mcpContext = Array.isArray(mcp_adapters) && mcp_adapters.length > 0
      ? `\n\nMCP adapters selected by user:\n- ${mcp_adapters.map((v: unknown) => String(v)).join("\n- ")}`
      : "";
    const systemPrompt = `You are Fix it Felix, an expert AI repair assistant embedded in the Breakthru field service management platform.

Your primary role is to help technicians diagnose and repair equipment issues.

When responding to repair queries:
1. Always structure responses with clear markdown headings: ## Issue Summary, ## Affected Components, ## Required Parts, ## Required Tools, ## Recommended Repair Steps, ## Related Manuals
2. Be specific about part numbers, quantities, and stock status when data is provided
3. Give numbered step-by-step repair instructions
4. Include safety warnings where appropriate
5. If diagnostic data is provided with confidence scores, reference them
6. Be concise but thorough - technicians need actionable information

When analyzing images, identify equipment, damage, wear patterns, or fault indicators.
Format all responses with markdown for clarity.${contextBlock ? `\n\nAdditional user context:\n${contextBlock}` : ""}${mcpContext}`;

    const response = await fetch(
      providerConfig.gateway,
      {
        method: "POST",
        headers: {
          ...(providerConfig.key ? { Authorization: `Bearer ${providerConfig.key}` } : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model || providerConfig.model,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            ...(Array.isArray(messages) ? messages : []),
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "AI gateway error. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("felix-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
