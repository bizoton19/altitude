# Random Forest vs LLM for Field Mapping: Comparison & Recommendation Plan

## Current State Analysis

### Current Implementation
- **Rule-based mapping**: Dictionary-based fuzzy matching in `backend/app/routers/imports.py`
- **LLM mapping (optional)**: Uses OpenAI GPT-3.5-turbo via `backend/app/services/llm_field_mapper.py`
- **Fallback**: Fuzzy string matching when LLM unavailable
- **Use case**: Map source CSV/JSON fields to Product Ban schema fields (20+ target fields)

### Field Mapping Requirements
- Input: Source field names, types, sample values
- Output: Mapping from source_field -> target_field (e.g., "violation_number" -> "ban_number")
- Target fields: ~20 core fields (ban_number, title, description, ban_date, injuries, deaths, etc.)
- Context: Field type, sample values, field name patterns

---

## Random Forest ML Approach Design

### Feature Engineering
1. **String similarity features**:
   - Levenshtein distance, Jaro-Winkler, sequence matcher ratio
   - Character n-gram overlap (2-grams, 3-grams)
   - Word-level token overlap
   - Prefix/suffix matching

2. **Semantic features**:
   - Field name embeddings (word2vec/fastText)
   - Keyword presence (date keywords, number keywords, etc.)
   - Field name length, word count, character patterns

3. **Context features**:
   - Detected data type (string, integer, date, float)
   - Sample value patterns (date formats, number ranges, string lengths)
   - Field position/index in source schema

4. **Target field features**:
   - Target field label/description similarity
   - Target field category (core, hazards, images, remedies)

### Model Architecture
- **Type**: Multi-class classification (one model per target field, or multi-label)
- **Algorithm**: Random Forest (scikit-learn)
- **Training data**: Historical mappings from actual imports
- **Output**: Probability distribution over target fields + confidence score

### Implementation Structure

**Training Script** (run separately):
```
backend/scripts/train_field_mapping_model.py
├── collect_training_data() - Extract from database
├── prepare_training_dataset() - Feature engineering
├── train_model() - Train Random Forest
├── evaluate_model() - Metrics calculation
└── save_model() - Export .pkl file
```

**Production Service** (deployed with app):
```
backend/app/services/ml_field_mapper.py
├── FeatureExtractor class (shared with training)
│   ├── extract_string_features()
│   ├── extract_semantic_features()
│   ├── extract_context_features()
│   └── extract_target_features()
└── FieldMappingModel class (inference only)
    ├── load_model() - Load pre-trained .pkl file
    ├── predict() - Map source fields to targets
    └── predict_with_confidence() - Return confidence scores
```

**Shared Module** (used by both):
```
backend/app/services/ml_field_mapper_features.py
└── FeatureExtractor class
    ├── extract_string_features()
    ├── extract_semantic_features()
    ├── extract_context_features()
    └── extract_target_features()
```

**Model Files** (deployed artifacts):
```
backend/models/
├── field_mapping_model.pkl - Trained model (gitignored if large)
├── field_mapping_metadata.json - Model version, accuracy, features
└── .gitignore - Optionally ignore .pkl files
```

---

## Comparison: Random Forest vs Cloud LLM vs Local Tiny LLM

### Pros and Cons

#### Random Forest ML Model

**Pros:**
- ✅ **Cost**: $0 per prediction (no API calls)
- ✅ **Speed**: <10ms per mapping (vs 500-2000ms for LLM API call)
- ✅ **Consistency**: Deterministic results (same input = same output)
- ✅ **Privacy**: No data sent to external APIs
- ✅ **Offline**: Works without internet connection
- ✅ **Scalability**: Can handle high-volume imports without rate limits
- ✅ **Interpretability**: Can extract feature importance
- ✅ **Customization**: Trained specifically on your domain data
- ✅ **No dependencies**: No OpenAI API key required
- ✅ **Predictable latency**: No network variability

**Cons:**
- ❌ **Training data required**: Needs historical mapping examples
- ❌ **Cold start problem**: Requires initial training dataset
- ❌ **Limited generalization**: May struggle with completely novel field names
- ❌ **Feature engineering effort**: Requires domain expertise
- ❌ **Model maintenance**: Needs retraining as new patterns emerge
- ❌ **Less semantic understanding**: May miss nuanced semantic relationships
- ❌ **Storage**: Model file size (~5-50MB depending on features)

#### Cloud LLM Options

##### Cloud LLM - GPT-3.5-turbo (Current)

**Pros:**
- ✅ **Semantic understanding**: Excellent at understanding meaning and context
- ✅ **Zero training**: Works immediately without training data
- ✅ **Handles novel cases**: Good at inferring mappings for unseen field names
- ✅ **Natural language**: Can understand field descriptions and context
- ✅ **Sample value analysis**: Can reason about sample values effectively
- ✅ **Flexibility**: Adapts to new target schemas without code changes
- ✅ **High accuracy**: 90-95% accuracy on complex mappings

**Cons:**
- ❌ **Cost**: ~$0.001-0.002 per file preview (with 10-20 fields)
- ❌ **Latency**: 500-2000ms per API call (network overhead)
- ❌ **Rate limits**: OpenAI API has rate limits (may throttle)
- ❌ **Inconsistency**: Same input can produce different outputs (temperature > 0)
- ❌ **Privacy concerns**: Field names and sample data sent to external service
- ❌ **Dependency**: Requires API key and internet connection
- ❌ **Error handling**: API failures require fallback logic
- ❌ **Cost scaling**: Costs increase linearly with usage volume
- ❌ **No interpretability**: Black box - can't explain why mapping was chosen

##### Cloud Tiny Models (Qwen, MiniMax, Gemini Flash-Lite)

**Pros:**
- ✅ **Lower cost**: 5-20x cheaper than GPT-3.5-turbo
- ✅ **Semantic understanding**: Good semantic capabilities (better than RF)
- ✅ **Zero training**: Works immediately
- ✅ **Faster**: Typically faster than GPT-3.5 (100-500ms latency)
- ✅ **No local setup**: Cloud-hosted, no infrastructure needed
- ✅ **Privacy**: Data sent to provider (but cheaper than OpenAI)

**Cons:**
- ❌ **Lower accuracy**: 75-85% accuracy (worse than GPT-3.5, similar to local tiny LLMs)
- ❌ **Still costs money**: ~$0.0001-0.0005 per file preview (much cheaper, but not free)
- ❌ **Privacy concerns**: Data still sent to external service
- ❌ **Dependency**: Requires API key and internet
- ❌ **Less proven**: Newer services, may have stability issues
- ❌ **Regional availability**: Some services (Qwen) may have regional restrictions

#### Local Tiny LLM (Ollama - Llama 3.2 1B/3B, Phi-3, Qwen2.5)

**Pros:**
- ✅ **Cost**: $0 per prediction (no API calls)
- ✅ **Privacy**: Runs locally, no data sent externally
- ✅ **Semantic understanding**: Good semantic understanding (better than RF, less than GPT-4)
- ✅ **Zero training**: Works immediately (though fine-tuning can improve accuracy)
- ✅ **Offline**: Works without internet (after initial setup)
- ✅ **No rate limits**: Can handle high-volume usage
- ✅ **Already integrated**: Ollama support exists in codebase (`LLMProvider.OLLAMA`)
- ✅ **Flexibility**: Can adapt to new schemas with prompt engineering
- ✅ **Sample value analysis**: Can reason about sample values

**Cons:**
- ❌ **Slower than RF**: 50-200ms per prediction (vs 10ms for RF, but faster than cloud LLM)
- ❌ **Model size**: 1-7GB storage required (tiny models: 1-3GB)
- ❌ **Memory**: Requires 2-8GB RAM to run (model must be loaded in memory)
- ❌ **Lower accuracy**: 80-88% accuracy (better than RF on semantic cases, worse than GPT-3.5)
- ❌ **Setup complexity**: Requires Ollama installation and model download
- ❌ **Inconsistency**: Non-deterministic (same as cloud LLM)
- ❌ **Deployment**: Need to ensure Ollama service is running
- ❌ **No interpretability**: Black box - can't explain mappings
- ❌ **Limited context**: Smaller context windows than cloud models

---

## Accuracy Comparison Table

| Metric | Rule-Based (Current Default) | Random Forest ML | Local Tiny LLM (Ollama) | Cloud LLM (GPT-3.5-turbo) |
|--------|------------------------------|------------------|-------------------------|---------------------------|
| **Overall Accuracy** | 70-80% | 85-95% (estimated) | 80-88% | 90-95% |
| **Exact Match Fields** | 95% | 98% | 96% | 98% |
| **Synonym/Variant Fields** | 50-60% | 80-90% | 75-85% | 90-95% |
| **Novel/Unseen Fields** | 30-40% | 60-75% | 70-80% | 85-90% |
| **Typo Tolerance** | Medium | High | Medium-High | High |
| **Semantic Mapping** | Low | Medium | Medium-High | High |
| **Confidence Scores** | Binary (match/no match) | Probability scores | Token probabilities | Not available |
| **False Positives** | Medium (15-20%) | Low (5-10%) | Medium (8-12%) | Low (5-8%) |
| **False Negatives** | High (20-30%) | Low (5-10%) | Medium (10-15%) | Low (5-8%) |
| **Precision** | 0.75-0.80 | 0.90-0.95 | 0.85-0.92 | 0.92-0.97 |
| **Recall** | 0.70-0.80 | 0.85-0.95 | 0.80-0.88 | 0.90-0.95 |
| **F1 Score** | 0.72-0.80 | 0.87-0.95 | 0.82-0.90 | 0.91-0.96 |

*Note: Accuracy estimates based on typical performance. Random Forest assumes good training data. Local LLM estimates based on tiny models (Llama 3.2 1B/3B, Phi-3-mini).*

---

## Cost & Performance Comparison

| Factor | Rule-Based | Random Forest | Local Tiny LLM (Ollama) | Cloud Tiny LLM (Qwen/MiniMax/Gemini Flash) | Cloud LLM (GPT-3.5) |
|--------|------------|---------------|-------------------------|--------------------------------------------|---------------------|
| **Cost per 1000 mappings** | $0 | $0 | $0 | $0.05-$0.50 | $0.50-$2.00 |
| **Cost per million tokens** | N/A | N/A | N/A | $0.10-$0.50 input, $0.40-$3.00 output | $2.50 |
| **Latency (p95)** | 5ms | 10-20ms | 50-200ms | 100-500ms | 1500ms |
| **Throughput** | 10,000/sec | 5,000/sec | 100-500/sec | 50-200/sec (rate limited) | 10-20/sec (rate limited) |
| **Setup Cost** | $0 | Development time | Ollama installation | $0 (just API key) | $0 (just API key) |
| **Ongoing Cost** | $0 | Model retraining | $0 | Per-use API cost (low) | Per-use API cost (high) |
| **Storage Required** | <1MB | 5-50MB | 1-7GB (model file) | 0 (cloud) | 0 (cloud) |
| **Memory Required** | <10MB | <100MB | 2-8GB RAM | 0 (cloud) | 0 (cloud) |
| **Scalability** | Excellent | Excellent | Good (limited by hardware) | Limited by API | Limited by API |
| **Deployment Complexity** | Low | Medium | Medium-High | Low | Low |
| **Accuracy** | 70-80% | 85-95% | 80-88% | 75-85% | 90-95% |

---

## Recommendation

### Updated Recommendation: **Random Forest Primary, Local LLM Secondary, Cloud LLM Optional**

After considering all three approaches (Random Forest, Local Tiny LLM, Cloud LLM), here's the updated recommendation:

### Primary Recommendation: **Random Forest** (Best Overall)

**Rationale:**
1. **Best performance**: 10-20ms latency (fastest option)
2. **Zero cost**: No API costs, no model storage overhead
3. **Good accuracy**: 85-95% accuracy is sufficient for most cases
4. **Low resource usage**: Small model file (5-50MB), minimal memory
5. **Deterministic**: Consistent results, interpretable
6. **Privacy**: No external dependencies
7. **Scalability**: Excellent throughput (5,000/sec)

### Secondary Option: **Local Tiny LLM (Ollama)** (Best for Semantic Understanding)

**When to consider:**
- Need better semantic understanding than RF (synonym/variant fields)
- Privacy requirements (can't use cloud)
- Already have Ollama infrastructure
- Willing to trade speed (50-200ms) for semantic capabilities
- Have 2-8GB RAM available

**Best models for this use case:**
- **Llama 3.2 3B** (3GB) - Best balance of accuracy and size
- **Phi-3-mini** (2.3GB) - Fast, good accuracy
- **Qwen2.5 1.5B** (1GB) - Smallest, still decent

### Tertiary Option: **Cloud LLM** (Best Accuracy, Highest Cost)

**When to use:**
- Need maximum accuracy (90-95%)
- Novel/unusual field schemas
- One-off imports where accuracy > cost
- User explicitly requests "best accuracy" mode

### Hybrid Approach Strategy

**Recommended Implementation:**
1. **Primary**: Random Forest (default, fastest, good accuracy)
2. **Fallback**: Rule-based (for low-confidence RF predictions)
3. **Optional Enhancement**: Local LLM (Ollama) - user can enable for semantic edge cases
4. **Premium Option**: Cloud LLM - user opt-in for maximum accuracy

### Implementation Strategy

**Phase 1: Develop Random Forest Model (Weeks 1-2)**
- Collect training data from existing imports
- Build feature engineering pipeline
- Train initial model
- Validate accuracy on held-out test set

**Phase 2: Deploy with Fallback (Week 3)**
- Integrate RF model as primary mapper
- Keep rule-based as fallback for low-confidence predictions
- A/B test against current LLM approach
- Monitor accuracy metrics

**Phase 3: Optional LLM Enhancement (Week 4+)**
- Keep LLM as optional "enhanced mode" for edge cases
- Use LLM only when RF confidence < threshold (e.g., < 0.7)
- Allows users to opt-in for highest accuracy when needed

### When to Use Each Approach

**Use Random Forest when:**
- ✅ Standard import workflows (primary use case)
- ✅ High-volume imports
- ✅ Cost sensitivity
- ✅ Performance critical (<20ms latency)
- ✅ Limited resources (small storage/memory)
- ✅ Need deterministic results

**Use Local Tiny LLM (Ollama) when:**
- ✅ Need semantic understanding (synonym/variant fields)
- ✅ Privacy requirements (can't use cloud)
- ✅ Already have Ollama infrastructure
- ✅ Willing to trade speed for semantic capabilities
- ✅ Have 2-8GB RAM available
- ✅ Offline/air-gapped environments that need LLM capabilities

**Use Cloud LLM when:**
- ✅ Need maximum accuracy (90-95%)
- ✅ Novel/unusual field schemas
- ✅ One-off imports where accuracy > cost
- ✅ User explicitly requests "best accuracy" mode
- ✅ No infrastructure constraints

**Use Rule-Based when:**
- ✅ RF model not yet trained (cold start)
- ✅ Simple exact/similar matches only
- ✅ Minimal dependencies required
- ✅ Fallback for low-confidence predictions

### Success Metrics

- **Accuracy**: Target 90%+ mapping accuracy
- **Cost reduction**: Eliminate 80-90% of LLM API calls
- **Performance**: <50ms p95 latency for field mapping
- **User satisfaction**: No decrease in mapping quality perception

---

## Implementation Plan

### Architecture: Separate Training + Model Deployment

**Training Approach**: Train model in separate script/environment, export trained model file (`.pkl` or `.joblib`), deploy model file with application.

**Deployment Approach**: Application loads pre-trained model file at startup, uses it for inference only.

### Step 1: Create Training Script (Separate Project/Script)

**Location**: `backend/scripts/train_field_mapping_model.py`

**Responsibilities**:
- Extract historical field mappings from database
- Collect field names, types, sample values, and correct mappings
- Minimum: 500-1000 labeled examples (preferably 2000+)
- Include diverse sources: CSV, JSON, different agencies
- Feature engineering and dataset preparation
- Model training and evaluation
- Export trained model file (`.pkl` or `.joblib`)
- Generate model metadata (feature names, version, accuracy metrics)

**Training Script Structure**:
```python
# backend/scripts/train_field_mapping_model.py
"""
Training script for field mapping Random Forest model.
Run separately to train model, then deploy the .pkl file.
"""
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib
from datetime import datetime

def collect_training_data():
    # Query database for historical mappings
    # Extract: source_field_name, source_type, sample_values, target_field
    pass

def extract_features(source_field_data):
    # Feature engineering pipeline
    pass

def train_model(X_train, y_train):
    # Train Random Forest
    # Hyperparameter tuning
    # Return trained model
    pass

def save_model(model, feature_names, metadata):
    # Save model to backend/models/field_mapping_model.pkl
    # Save metadata JSON
    pass

if __name__ == "__main__":
    # Run training pipeline
    data = collect_training_data()
    X, y = prepare_features(data)
    model = train_model(X, y)
    save_model(model, ...)
```

### Step 2: Feature Engineering (In Training Script)
- Implement feature extraction functions
- Test feature importance
- Optimize feature set (remove low-value features)
- **Important**: Save feature extraction logic - same code needed in production

### Step 3: Model Training (Run Training Script)
- Split data: 70% train, 15% validation, 15% test
- Train Random Forest (start with 100-200 trees)
- Tune hyperparameters (max_depth, min_samples_split, etc.)
- Evaluate on test set
- Export model file to `backend/models/field_mapping_model.pkl`
- Export metadata (version, accuracy, feature list) to `backend/models/field_mapping_metadata.json`

### Step 4: Production Integration
- Create `backend/app/services/ml_field_mapper.py` service
- Load trained model file at application startup (or lazy load on first use)
- Implement inference-only prediction functions
- **Use same feature extraction code** as training script (extract to shared module)
- Integrate into `imports.py` preview endpoint
- Add confidence threshold logic
- Implement fallback chain: RF -> Rule-based -> LLM (optional)

**Production Service Structure**:
```python
# backend/app/services/ml_field_mapper.py
import joblib
from pathlib import Path

class FieldMappingModel:
    def __init__(self):
        self.model = None
        self.feature_extractor = None
        self.metadata = None
    
    def load_model(self):
        """Load pre-trained model from file."""
        model_path = Path(__file__).parent.parent.parent / "models" / "field_mapping_model.pkl"
        self.model = joblib.load(model_path)
        # Load metadata, feature extractor, etc.
    
    def predict(self, source_field_data):
        """Predict target field (inference only)."""
        features = self.extract_features(source_field_data)
        prediction = self.model.predict(features)
        confidence = self.model.predict_proba(features)
        return prediction, confidence
```

### Step 5: Deployment Workflow

**Model Files** (committed to repo or stored separately):
- `backend/models/field_mapping_model.pkl` - Trained model
- `backend/models/field_mapping_metadata.json` - Model metadata
- `backend/models/.gitignore` - Optionally ignore large model files, use CI/CD to deploy

**Dependencies** (add to `pyproject.toml`):
```toml
dependencies = [
    # ... existing dependencies
    "scikit-learn>=1.3.0",  # For Random Forest
    "joblib>=1.3.0",        # For model serialization
    "numpy>=1.24.0",        # For feature arrays
]
```

**Training Dependencies** (separate requirements file or notebook):
- `scikit-learn`, `pandas`, `numpy`, `joblib`, `jupyter` (optional)

### Step 6: Monitoring & Iteration
- Log prediction confidence scores
- Track accuracy over time
- Collect misclassification examples for retraining
- **Retraining workflow**:
  1. Run training script with new data
  2. Evaluate new model performance
  3. If better, replace model file
  4. Deploy new model file (restart application or hot-reload)
- Periodic model retraining (monthly/quarterly)

### Training vs Production Code Separation

**Training Script** (`scripts/train_field_mapping_model.py`):
- Runs offline/on-demand
- Requires database access for training data
- Can use Jupyter notebooks for exploration
- Output: Trained model file

**Production Service** (`app/services/ml_field_mapper.py`):
- Loads pre-trained model
- Inference only (no training)
- Lightweight, fast startup
- No database queries for training data

---

## Risk Mitigation

1. **Cold start**: Start with rule-based, gradually enable RF as training data grows
2. **Low confidence cases**: Fall back to rule-based or LLM
3. **Model drift**: Monitor accuracy, retrain quarterly
4. **Feature engineering complexity**: Start simple, iterate based on performance

---

## Conclusion

**Recommended approach**: 

1. **Primary**: Implement Random Forest as default mapper (best performance, cost, and resource efficiency)
2. **Fallback**: Rule-based for low-confidence predictions
3. **Optional Cloud Tiny Models**: Gemini Flash-Lite or Qwen-Flash for cost-effective semantic mapping (5-20x cheaper than GPT-3.5)
4. **Optional Local LLM**: Local Tiny LLM (Ollama) for privacy-sensitive/offline semantic edge cases
5. **Premium Option**: GPT-3.5-turbo or GPT-4o-mini for maximum accuracy when needed

This provides a tiered approach:
- **Fast path**: Random Forest (covers 85-95% of cases, zero cost, fastest)
- **Cloud semantic path**: Gemini Flash-Lite/Qwen-Flash (covers edge cases, ~$0.10-$0.50 per 1K mappings)
- **Local semantic path**: Local LLM/Ollama (privacy-sensitive, offline, zero API cost)
- **Premium path**: GPT-3.5-turbo (maximum accuracy, $0.50-$2.00 per 1K mappings)

### Cost Analysis

**At 10,000 mappings/month:**
- Random Forest: $0/month (one-time dev cost)
- Cloud Tiny Models (Gemini Flash-Lite): ~$1-5/month
- GPT-3.5-turbo: ~$5-20/month

**At 100,000 mappings/month:**
- Random Forest: $0/month
- Cloud Tiny Models: ~$10-50/month
- GPT-3.5-turbo: ~$50-200/month

**Why Random Forest is still primary recommendation:**
- 5-10x faster than any LLM option (10-20ms vs 50-2000ms)
- Zero ongoing costs (vs $1-200/month for cloud models)
- Comparable or better accuracy (85-95% vs 75-90% for tiny models)
- No API dependencies or rate limits
- Deterministic and interpretable

**Cloud Tiny Models (Gemini Flash-Lite, Qwen-Flash) are excellent alternatives** when:
- You need semantic understanding without infrastructure
- Volume is moderate (costs stay low)
- You want zero setup (just API key)
- 75-85% accuracy is acceptable

**Local LLM (Ollama) is a great middle ground** between Random Forest (fast, deterministic) and Cloud LLM (accurate but expensive), offering semantic understanding with zero API costs. Since Ollama is already integrated, it's an excellent secondary option for privacy-sensitive cases.

See `CLOUD_TINY_MODELS_PRICING.md` for detailed pricing comparison.
