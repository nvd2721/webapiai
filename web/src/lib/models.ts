import "server-only";
import { getPricing } from "./newapi";
import { MODEL_META, guessKind, guessVendor, type ModelKind } from "@/data/model-meta";

export type Model = {
  id: string;
  vendor: string;
  kind: ModelKind;
  perCall: boolean;
  input: number | null; // USD per 1M tokens
  output: number | null;
  cacheRead: number | null;
  callPrice: number | null; // USD per request when perCall
  context?: number;
  maxOutput?: number;
  description?: string;
  reasoning?: boolean;
  vision?: boolean;
  tools?: boolean;
  endpoints: string[];
};

// New API ratio 1 = $0.002 per 1K tokens = $2 per 1M tokens.
const USD_PER_RATIO = 2;

export async function getModels(): Promise<Model[]> {
  let pricing;
  try {
    pricing = await getPricing();
  } catch (e) {
    console.error("[models] pricing unavailable", e);
    return [];
  }
  const vendors = new Map((pricing.vendors || []).map((v) => [v.id, v.name]));
  // Public prices are shown for the "default" group.
  const groupRatio = pricing.group_ratio?.default ?? 1;

  return (pricing.data || [])
    .map((p): Model => {
      const meta = MODEL_META[p.model_name] || {};
      const perCall = p.quota_type === 1;
      const input = perCall ? null : p.model_ratio * USD_PER_RATIO * groupRatio;
      return {
        id: p.model_name,
        vendor: (p.vendor_id && vendors.get(p.vendor_id)) || guessVendor(p.model_name),
        kind: meta.kind || guessKind(p.model_name),
        perCall,
        input,
        output: input == null ? null : input * (p.completion_ratio || 1),
        cacheRead: input != null && p.cache_ratio != null ? input * p.cache_ratio : null,
        callPrice: perCall ? p.model_price * groupRatio : null,
        context: meta.context,
        maxOutput: meta.maxOutput,
        description: meta.description,
        reasoning: meta.reasoning,
        vision: meta.vision,
        tools: meta.tools,
        endpoints: p.supported_endpoint_types || [],
      };
    })
    .sort((a, b) => a.vendor.localeCompare(b.vendor) || a.id.localeCompare(b.id));
}

export async function getModel(id: string): Promise<Model | undefined> {
  return (await getModels()).find((m) => m.id === id);
}
