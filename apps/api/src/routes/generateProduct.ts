import { ZodError, z } from "zod";
import crypto from "crypto";
import { stableHash } from "../utils/hash.js";
import { getCache, setCache } from "../cache/redis.js";
import { callOpenAI } from "../llm/openai.js";
import { buildProductCandidates } from "../engine/productCandidates.js";
import { db } from "../db/sqlite.js";
import { searchPolicyClauses } from "../rag/vector.service.js";
import { getClaimsInsights } from "../claims/claims.service.js";


/**
 * ---------------------------
 * Schema
 * ---------------------------
 */
export const GenerateProductSchema = z.object({
  generation_mode: z.literal("insurer_product_design"),
  lifecycle: z.string(),
  portfolio_context: z.any(),
  business_strategy: z.any(),
  competitor_landscape: z.any(),
  product_constraints: z.any(),
});

/**
 * ---------------------------
 * Route
 * ---------------------------
 */
export const generateProductRoutes = async (app) => {
  app.post("/generate-product", async (req, reply) => {
    try {
      const requestId = crypto.randomUUID();

      const parsed = GenerateProductSchema.parse(req.body);

      const cacheKey =
        "product:" +
        stableHash({
          portfolio: parsed.portfolio_context,
          strategy: parsed.business_strategy,
          market: parsed.competitor_landscape,
          constraints: parsed.product_constraints,
        });

      const cached = await getCache(cacheKey);
      if (cached) return reply.send(JSON.parse(cached));

      // ----------------------------------
      // 1️⃣ Build deterministic candidates
      // ----------------------------------
      const candidates = buildProductCandidates(parsed);

      // ----------------------------------
      // 2️⃣ Build RAG query
      // ----------------------------------
      const ragQuery = `
Lifecycle: ${parsed.lifecycle}
Portfolio: ${JSON.stringify(parsed.portfolio_context)}
Strategy: ${JSON.stringify(parsed.business_strategy)}
Constraints: ${JSON.stringify(parsed.product_constraints)}
`;

      // Optional metadata filters
      const filters = {};
      if (parsed.portfolio_context?.company) {
        filters.company = parsed.portfolio_context.company;
      }
      if (parsed.portfolio_context?.product) {
        filters.product = parsed.portfolio_context.product;
      }

      // ----------------------------------
      // 3️⃣ Retrieve policy clauses
      // ----------------------------------
      const policyClauses = await searchPolicyClauses(ragQuery, filters);

      console.log("📚 Retrieved policy clauses:", policyClauses.length);
      console.log(
        policyClauses.map((c) => ({
          score: c.score?.toFixed?.(3),
          file: c.metadata?.file,
        }))
      );

      // ----------------------------------
      // 📊 Retrieve claims insights
      // ----------------------------------
      const claimsInsights = getClaimsInsights({
        insurer: parsed.portfolio_context?.company,
        policy_type: parsed.portfolio_context?.product
      });

      console.log("📊 Claims insights:", claimsInsights.length);


      // ----------------------------------
      // 4️⃣ Build grounded policy context
      // ----------------------------------
      const policyContext = policyClauses.length
        ? policyClauses
            .map(
              (c, idx) =>
                `Clause ${idx + 1} (${c.metadata?.company || "NA"} / ${
                  c.metadata?.product || "NA"
                }):\n${c.text}`
            )
            .join("\n\n")
        : "No relevant policy clauses found.";

      // ----------------------------------
      // 5️⃣ Strong grounding instructions
      // ----------------------------------
      const groundedInput = {
        ...parsed,
        policy_context: `
          You are an INSURANCE PRODUCT DESIGN EXPERT.

          STRICT RULES:
          - Use ONLY the policy clauses provided below.
          - Do NOT invent coverage, exclusions, limits, or benefits.
          - If something is missing, explicitly say:
            "Not explicitly mentioned in policy wording".
          - When suggesting changes, explain risk impact and underwriting impact.

          ========================
          POLICY CLAUSES
          ========================
          ${policyContext}
          `,
        claims_context: JSON.stringify(claimsInsights, null, 2)
      };

      // ----------------------------------
      // 6️⃣ LLM synthesis (grounded)
      // ----------------------------------
      const { validated } = await callOpenAI({
        requestId,
        mode: "product_generation",
        input: groundedInput,
        candidates,
      });

      // ----------------------------------
      // 7️⃣ Persist
      // ----------------------------------
      db.saveQuote({
        request_id: requestId,
        lifecycle: parsed.lifecycle,
        input_json: parsed,
        output_json: validated,
      });

      await setCache(cacheKey, JSON.stringify(validated), 3600);

      return reply.send(validated);
    } catch (e) {
      if (e instanceof ZodError) {
        return reply
          .code(400)
          .send({ error: "VALIDATION_ERROR", issues: e.issues });
      }
      req.log.error(e);
      return reply.code(500).send({ error: "INTERNAL_ERROR" });
    }
  });
};
