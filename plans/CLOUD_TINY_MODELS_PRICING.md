# Cloud Tiny Model Pricing Comparison

## Pricing Overview for Field Mapping Use Case

**Typical field mapping request**: ~500-1000 tokens (input: field names, types, samples; output: mapping JSON)

### Cost per 1000 Field Mappings

| Provider | Model | Input (per M tokens) | Output (per M tokens) | Cost per 1K mappings* | Notes |
|----------|-------|---------------------|----------------------|----------------------|-------|
| **OpenAI** | GPT-3.5-turbo | $0.50 | $1.50 | $0.50-$2.00 | Current default |
| **OpenAI** | GPT-4o-mini | $0.15 | $0.60 | $0.15-$0.75 | Cheaper option |
| **Google** | Gemini 2.5 Flash-Lite | $0.10 | $0.40 | $0.10-$0.50 | Very cheap, fast |
| **Google** | Gemini 3 Flash | $0.50 | $3.00 | $0.50-$3.50 | Balanced option |
| **Qwen Cloud** | Qwen3-0.6B | ¥0.002 | ¥0.006 | ~$0.0003-$0.001 | Extremely cheap (Chinese Yuan) |
| **Qwen Cloud** | Qwen3-1.7B | Higher | Higher | ~$0.001-$0.003 | Tiny model, regional |
| **Qwen Cloud** | Qwen-Flash | $0.05 | $0.40 | $0.05-$0.45 | Fast, cost-efficient |
| **MiniMax** | MiniMax-01 | $0.20 | $1.10 | $0.20-$1.30 | Competitive pricing |
| **MiniMax** | MiniMax M2 | $0.30 | $1.20 | $0.30-$1.50 | Newer model |

*Cost per 1000 mappings assumes ~500 tokens input + 300 tokens output per mapping

### Cost Comparison: 10,000 Field Mappings/Month

| Provider | Model | Monthly Cost (10K mappings) | Monthly Cost (100K mappings) |
|----------|-------|----------------------------|------------------------------|
| **Random Forest** | N/A | **$0** | **$0** |
| **Local LLM (Ollama)** | N/A | **$0** | **$0** |
| **Qwen Cloud** | Qwen3-0.6B | **$0.30-$1.00** | **$3-$10** |
| **Google** | Gemini Flash-Lite | **$1-$5** | **$10-$50** |
| **Qwen Cloud** | Qwen-Flash | **$0.50-$4.50** | **$5-$45** |
| **OpenAI** | GPT-4o-mini | **$1.50-$7.50** | **$15-$75** |
| **MiniMax** | MiniMax-01 | **$2-$13** | **$20-$130** |
| **OpenAI** | GPT-3.5-turbo | **$5-$20** | **$50-$200** |
| **Google** | Gemini 3 Flash | **$5-$35** | **$50-$350** |

### Accuracy vs Cost Trade-off

| Option | Accuracy | Cost per 1K | Best For |
|--------|----------|-------------|----------|
| **Random Forest** | 85-95% | $0 | High-volume, standard cases |
| **Local LLM (Ollama)** | 80-88% | $0 | Privacy-sensitive, offline |
| **Qwen 0.6B (Cloud)** | 70-80% | $0.0003-$0.001 | Ultra-low cost, high volume |
| **Gemini Flash-Lite** | 75-85% | $0.10-$0.50 | Cost-sensitive, good accuracy |
| **Qwen-Flash** | 80-85% | $0.05-$0.45 | Fast + cheap |
| **GPT-4o-mini** | 85-90% | $0.15-$0.75 | Good balance |
| **GPT-3.5-turbo** | 90-95% | $0.50-$2.00 | High accuracy needed |

### Recommendations by Use Case

**Ultra-Low Cost (High Volume)**
- **Qwen Cloud Qwen3-0.6B**: ~$0.001 per 1K mappings (10-20x cheaper than GPT-3.5)
- **Gemini Flash-Lite**: ~$0.10-$0.50 per 1K mappings
- Note: Lower accuracy (70-85%) but acceptable for standard cases

**Best Balance (Cost + Accuracy)**
- **Gemini Flash-Lite**: Good accuracy (75-85%), very cheap ($0.10-$0.50 per 1K)
- **Qwen-Flash**: Fast + cheap ($0.05-$0.45 per 1K)
- **GPT-4o-mini**: Better accuracy (85-90%), still affordable ($0.15-$0.75 per 1K)

**Maximum Accuracy**
- **GPT-3.5-turbo**: 90-95% accuracy, $0.50-$2.00 per 1K
- **Gemini 3 Flash**: 88-93% accuracy, $0.50-$3.50 per 1K

**Zero Cost Options**
- **Random Forest**: 85-95% accuracy, $0, requires training
- **Local LLM (Ollama)**: 80-88% accuracy, $0, requires infrastructure

## Implementation Considerations

### Qwen Cloud
- **Pros**: Extremely cheap, good for high volume
- **Cons**: Regional availability (primarily China/Asia), Chinese documentation, newer service
- **API**: Alibaba Cloud Model Studio
- **Best for**: High-volume imports where cost is primary concern

### MiniMax
- **Pros**: Competitive pricing, good performance
- **Cons**: Newer service, less established than OpenAI/Google
- **Best for**: Cost-conscious users wanting OpenAI-like experience

### Gemini Flash-Lite
- **Pros**: Very cheap, fast, from Google (reliable infrastructure)
- **Cons**: Lower accuracy than GPT-3.5, newer model
- **Best for**: High-volume, cost-sensitive use cases with good accuracy needs

### Comparison to Random Forest

**At 10,000 mappings/month:**
- Random Forest: $0 (one-time development cost)
- Qwen 0.6B: ~$1/month
- Gemini Flash-Lite: ~$1-5/month
- GPT-3.5-turbo: ~$5-20/month

**At 100,000 mappings/month:**
- Random Forest: $0
- Qwen 0.6B: ~$10/month
- Gemini Flash-Lite: ~$10-50/month
- GPT-3.5-turbo: ~$50-200/month

**Break-even point**: Random Forest becomes cost-effective after ~1-2 months of development time, assuming moderate to high usage.

## Updated Recommendation

Given cloud tiny model options:

1. **Primary**: Random Forest (best for high volume, zero cost)
2. **Secondary**: Gemini Flash-Lite or Qwen-Flash (good balance of cost/accuracy for moderate volume)
3. **Tertiary**: Local LLM (Ollama) (privacy-sensitive, offline)
4. **Premium**: GPT-3.5-turbo or GPT-4o-mini (maximum accuracy when cost acceptable)

Cloud tiny models are excellent middle ground - much cheaper than GPT-3.5, no infrastructure needed, good accuracy (75-85%).
