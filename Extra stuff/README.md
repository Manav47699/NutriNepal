# Fitness-instructor


# System architecture
```
=== THE NEPALI LIFESTYLE-BASED DIET & FITNESS PIPELINE ===

 [ USER CAPTURE LAYER ]
    │  - Capture Method: Next.js Web App / Mobile Frontend UI
    │  - Data Captured: Profile Inputs, Medical Conditions, Cultural Status
    ▼
 [ STEP 1: User Profile Ingestion ]
    │  - Input Data: JSON Payload -> FastAPI Backend
    │  - Database Action: Write state matrices to PostgreSQL (user_profiles)
    │  - Dynamic Math: Evaluate BMR via Mifflin-St Jeor Equation
    │  - Calculate TDEE: Multiply BMR by Activity Factor (AF) based on daily routine
    │  - Latency: ~1.0 ms
    ▼
 [ STEP 2: Portion Size Logic (Deterministic) ]
    │  - Input Data: User-selected visual portion options from UI 
    │  - Component Ratio Map: Hardcoded structural distribution (Rice: 60%, Dal: 20%, Vegetable: 20%)
    │  - Scalar Function: Multiply portion weight arrays by base food nutrition vectors
    │  - Output Data: Exact baseline calorie and macronutrient estimation for logged meals
    │  - Latency: ~1.5 ms
    ▼
 [ STEP 3: Multi-Layer Exclusion Engine ]
    │  - Exclusion Rule 1 (Medical): Filter out foods matching user's allergy array or disease profile
    │                             (e.g., If 'Uric Acid' -> Remove Purine-rich Tamba / Gedagudi)
    │  - Exclusion Rule 2 (Cultural): Filter out foods banned by religious fast or ritual state
    │                              (e.g., If 'Jutho/Mourning' -> Remove non-veg / Masur ko Dal)
    │  - Exclusion Rule 3 (Safety Guardrail): If user deficit target > 25% of TDEE -> Automatically
    │                                         re-scale target calories to safe boundaries
    │  - Output Data: Filtered, clinically/culturally safe Nepali food options JSON
    │  - Latency: ~3.5 ms
    ▼
 [ STEP 4: Conversational Logging Buffer ]
    │  - Input Data: Nightly user natural language response string ("I had some alu chana and a roti")
    │  - Extraction Routine: Schema validation using Pydantic + Constrained JSON decoding
    │  - Similarity Matching: Vector Embeddings + Cosine Similarity matching against database entries
    │  - Outlier Filter: Drop inputs reporting physiologically impossible daily logs (< 600 kcal)
    │  - Latency: ~4.0 ms
    ▼
 [ STEP 5: Prompt Context Assembly ]
    │  - Context Merge: Combine User Profile Matrix + Verified Daily Meal Intake + Clean Safe Foods List
    │  - Design Paradigm: Few-Shot Chain-of-Thought (CoT) Engineering
    │  - System Rule: Enforce structured clinical trainer tone focused on everyday Nepali context
    │  - Output Data: Structured Markdown / JSON Prompt String
    │  - Latency: ~0.5 ms
    ▼
 [ STEP 6: AI Inference Layer (Probabilistic) ]
    │  - API Model Router: LiteLLM Interface abstraction (calling Gemini Flash / GPT-4o-mini)
    │  - Model Computation: Process prompt parameters to formulate structured qualitative summary
    │  - Structural Output: Forced compliance to specific output schema via token gating
    │  - Latency: ~1200 ms (Network roundtrip + context token evaluation)
    ▼
 [ STEP 7: Recommendation Summary Formatter ]
    │  - Input Data: Generated AI text stream containing advice matrix
    │  - Content Parsers: Split unstructured summary blocks into action items and warning boxes
    │  - Payload Compilation: Bundle calculated raw stats together with textual advice
    │  - Output Data: Final JSON/HTML Rich Media Advisory Feed Card
    │  - Latency: ~1.0 ms
    ▼
 [ CONSUMPTION TIER ] ───► App Dashboard UI (Renders rich cards, triggers local alerts, loops to next day)
 ```
