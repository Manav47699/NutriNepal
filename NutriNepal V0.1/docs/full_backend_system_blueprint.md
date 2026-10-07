# Full System Design & Implementation Blueprint

## Nepali Lifestyle-Based Diet and Fitness Advisory System

**Document purpose:** Final technical blueprint for implementation of
the current project.

**Architectural baseline:** React + Django REST Framework + SQLite (Development) / PostgreSQL (Logical Production) + internal FastAPI AI service + YOLOv8 + ChromaDB + local Ollama LLM (Qwen2.5:3b).

This design consolidates the current Django implementation, the SRS,
DFDs, UML models, proposal, and the newer backend-planning material.
Where the older architecture introduced unnecessary infrastructure or
blurred service ownership, this specification deliberately simplifies
it.

The project requirements establish the core pipeline as **profile → meal
input → food identification → nutrition calculation → constraint
screening → recommendation → history**. The proposal
specifically calls for YOLO segmentation, semantic food matching,
deterministic nutritional computation, and structured LLM output.

------------------------------------------------------------------------

# 1. Current Architecture Assessment

## 1.1 Current implementation

The Django backend contains the following registered applications under `backend/apps/`:

``` text
Django
│
├── accounts
│   ├── CustomUser
│   ├── registration
│   ├── login
│   └── JWT authentication
│
├── profiles
│   ├── UserProfile
│   ├── MedicalCondition
│   ├── Allergy
│   └── DietaryRestriction
│
├── nutritiion
│   ├── FoodItem
│   └── FoodAlias
│
└── meals
    ├── MealLog
    ├── MealFoodItems (stored in class MealFoodItems)
    ├── TotalFoodAnalysis
    └── MealRecommendation
```

The current implementation contains these four apps. `accounts` owns authentication, `profiles` owns health/profile information, `nutritiion` (spelled with double 'ii' in the folder path) owns active canonical food items and aliases, and `meals` owns meal logs, food analyses, and personalized LLM recommendations.

The global JWT endpoints exist:

``` text
POST /api/token/
POST /api/token/refresh/
```

and the application-specific authentication endpoints are:

``` text
POST /api/accounts/register/
POST /api/accounts/login/
```

## 1.2 What should remain

The following architecture should **not be redesigned**:

-   Django remains the main backend.
-   SQLite remains the local development database; PostgreSQL is the production target.
-   `accounts` remains responsible for identity/authentication.
-   `profiles` remains responsible for user health/profile data.
-   `meals` remains responsible for meal records and recommendations.
-   `nutritiion` remains responsible for active canonical food lists.
-   JWT remains the authentication mechanism.
-   React communicates with Django, not directly with FastAPI.
-   FastAPI remains a separate internal AI/ML service.

This is consistent with the existing UML architecture where the web
application mediates communication between the user and
analytical/storage components.

## 1.3 Problems that need correction

There are several architectural issues in the earlier documents.

### Problem 1 --- FastAPI and ChromaDB manage vector-based food matching and nutrition calculations

Some earlier designs place a "nutrition database" behind FastAPI. That could create two sources of truth:

``` text
Django SQLite / PostgreSQL
        +
FastAPI ChromaDB nutrition metadata
```

In the actual implementation:
- **FastAPI / ChromaDB performs semantic retrieval and nutritional calculation.** ChromaDB is seeded with a copy of the canonical nutrition data (from `master_database.json`) as part of its vector store metadata.
- FastAPI performs the food detection via YOLO, portion estimation via geometric quantity modeling, vector matching via ChromaDB, and performs the calorie/macro arithmetic (using values per gram in its vector store metadata) directly.
- FastAPI returns this pre-calculated structured nutritional data to Django.
- **Django persists the results.** It receives these pre-calculated values and writes them directly to `TotalFoodAnalysis` and `MealFoodItems` models. Django does not look up foods in its `nutritiion` app or perform calculations itself during the image analysis flow.
- Django's relational database (SQLite/PostgreSQL) remains the authoritative persistence layer for user logs, recommendations, and active food lists (used for manual searches and admin lookups via the `nutritiion` app).

``` text
FastAPI (ChromaDB Vector Lookup)
   │
   │ computes portion weight, matches food alias,
   │ and calculates item & total nutritional macros
   ▼
Django
   │
   │ receives and persists pre-calculated values
   ▼
SQLite / PostgreSQL (TotalFoodAnalysis & MealFoodItems)
```

------------------------------------------------------------------------

### Problem 2 --- Nutrition arithmetic should not be performed by the LLM

The LLM must never determine:

-   calories
-   protein
-   carbohydrates
-   fat
-   portion calculations
-   BMI
-   BMR/TDEE
-   constraint decisions

Those are deterministic calculations performed by FastAPI service code (prior to calling the LLM) using canonical food values.

The LLM receives already calculated facts (such as user profile details and calculated macros) and generates narrative guidance.

This directly follows the proposal's requirement that standard code performs nutritional calculations and health screening before the structured LLM stage.

------------------------------------------------------------------------

### Problem 3 --- Redis/Celery is not required

The previous `workflow.md` proposes Redis + Celery/RQ for asynchronous meal processing.

For this project, that is unnecessary. The expected AI response target is roughly 3--5 seconds, and the SRS itself specifies a three-second image-processing target.

Therefore:

**Active architecture: synchronous Django → FastAPI HTTP request.**

If real inference later exceeds acceptable latency, background processing can be introduced without changing the ownership model, as the model structures already support status tracking.

------------------------------------------------------------------------

### Problem 4 --- Repositories are unnecessary

The older workflow proposes:

``` text
views
 ↓
services
 ↓
repositories
 ↓
ORM
```

For this project, repositories do not provide enough value to justify another abstraction.

Use:

``` text
View
 ↓
Serializer
 ↓
Service function where business logic is non-trivial (e.g. meal_analysis_service, meal_recommendation_service)
 ↓
ORM
```

Not every operation needs a service.

------------------------------------------------------------------------

### Problem 5 --- Notifications and Progress Tracking are not part of the current implementation

The workflow document promotes periodic notifications and a progress app to core requirements.

However, the current implementation focuses strictly on:

-   profile
-   meal logging
-   food detection
-   nutrition calculations
-   personalized recommendations

Therefore:

**Notifications and Progress Tracking are postponed/deferred.**

No notification model, scheduler, progress tracking app, or progress models are implemented in the current system.

------------------------------------------------------------------------

# 2. Final Proposed Architecture

## 2.1 High-level architecture

``` mermaid
flowchart TB
    U[User]

    subgraph CLIENT["Client"]
        R[React Frontend]
    end

    subgraph BACKEND["Application Backend"]
        D[Django REST API]

        subgraph APPS["Django Applications"]
            ACC[Accounts]
            PRO[Profiles]
            MEA[Meals & Recommendations]
            NUT[Nutritiion]
        end

        DB[(SQLite / PostgreSQL)]
        MEDIA[Media Storage]
    end

    subgraph AI["Internal AI Service"]
        F[FastAPI]
        Y[YOLO Segmentation]
        M[Semantic Matching]
        C[(ChromaDB)]
        P[Portion Estimation]
        L[LLM]
    end

    U --> R
    R -->|HTTPS + JWT| D

    D --> ACC
    D --> PRO
    D --> MEA
    D --> NUT

    ACC --> DB
    PRO --> DB
    MEA --> DB
    NUT --> DB

    MEA --> MEDIA

    D -->|Internal HTTP| F

    F --> Y
    F --> M
    F --> P
    M --> C
    F --> L

    F -->|Structured result| D
```

## 2.2 Component responsibilities

  Component       Responsibility                      Owns
  --------------- ----------------------------------- ------------------------------------
  React           User interface                      UI state
  Django          Main application/API                Application data + business rules
  SQLite/Postgres Persistent storage                  All authoritative application data
  Media storage   Uploaded meal images                Image files
  FastAPI         AI processing                       AI execution state only
  YOLO            Food segmentation                   Model inference
  ChromaDB        Semantic retrieval                  Derived embeddings + food metadata
  LLM             Recommendation narrative            Generated text (Ollama engine)
  User            Supplies profile/meal information   User input

## 2.3 Communication boundaries

``` text
React
  │
  │ Public HTTPS
  ▼
Django
  │
  │ Internal HTTP
  ▼
FastAPI
```

React never calls:

``` text
FastAPI
ChromaDB
LLM
YOLO
SQLite / PostgreSQL
```

directly.

This preserves one public authentication boundary.

------------------------------------------------------------------------

# 3. System Boundary

## 3.1 Inside

``` text
React frontend
Django REST API
SQLite (Development) / PostgreSQL (Production)
Meal image storage (media/meal_photos/)
FastAPI AI service
YOLO model (best.pt)
Embedding model (sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2)
ChromaDB vector store
Local Ollama LLM (Qwen2.5:3b)
Recommendation orchestration
```

## 3.2 External

Only the following may be external:

### LLM provider

Currently runs:

``` text
Local LLM (via Ollama on port 11434)
```

but could eventually target:

``` text
Hosted LLM API
```

FastAPI communicates with it. The rest of the application does not.

### External nutrition sources

The project uses compiled nutrition sources such as:

-   Nepal Food Composition material
-   Nepali Meals Dataset
-   Nepal Nutrition and Food Security Portal

These are **data-ingestion sources** (stored in `master_database.json`), not runtime APIs.

------------------------------------------------------------------------

# 4. Django Applications

The final Django application set consists of:

``` text
backend/apps/
├── accounts/
├── profiles/
├── meals/
└── nutritiion/
```

No separate `recommendations` or `progress` app is registered or implemented. Recommendations are managed within the `meals` app under the `MealRecommendation` model.

A dashboard is a frontend page built from existing API data.

------------------------------------------------------------------------

## 4.1 Accounts

### Responsibility

Own:

-   user identity
-   registration
-   login
-   JWT authentication
-   account information

### Owns

``` text
CustomUser
```

### Does not own

-   health information
-   meals
-   nutrition calculations
-   recommendations

### Existing status

Already implemented.

Keep it.

------------------------------------------------------------------------

# 5. Profiles App

## Responsibility recommendations
-   progress

### Existing status

Already implemented.

Keep it.

------------------------------------------------------------------------

# 5. Profiles App

## Responsibility

Own the user's:

-   demographic information
-   physical metrics
-   fitness goal
-   activity level
-   dietary preferences
-   medical conditions
-   allergies
-   cultural/religious restrictions

The SRS explicitly requires user profiles containing health metrics and
cultural/religious constraints.

## Models

### UserProfile

Implemented fields:

  Field                 Type                            Required
  --------------------- ----------------------------- ----------
  id                    Integer (Auto-Increment)             Yes
  user                  OneToOne → CustomUser                Yes
  age                   PositiveSmallIntegerField            Yes
  gender                CharField (GenderChoices)            Yes
  height_cm             DecimalField                         Yes
  weight_kg             DecimalField                         Yes
  target_weight_kg      DecimalField                          No
  activity_level        CharField (ActivityLevelChoices)     Yes
  fitness_goal          CharField (FitnessGoalChoices)       Yes
  dietary_preference    CharField (DietaryPrefChoices)       Yes
  created_at            DateTimeField (auto_now_add)         Yes
  updated_at            DateTimeField (auto_now)             Yes

Choices implemented:

``` text
GenderChoices:
    MALE
    FEMALE
    OTHER

ActivityLevelChoices:
    SEDENTARY
    LIGHT
    MODERATE
    VERY_ACTIVE
    ATHLETE

FitnessGoalChoices:
    LOSE_WEIGHT
    MAINTAIN_WEIGHT
    GAIN_WEIGHT
    BUILD_MUSCLE

DietaryPreferenceChoices:
    VEGETARIAN
    NON_VEGETARIAN
```

## Relationships

``` text
CustomUser
     │
     │ 1:1
     ▼
UserProfile
```

Medical conditions, allergies, and dietary restrictions are connected to the profile through many-to-many relationships:

``` text
UserProfile
  ├── M:N MedicalCondition (related_name="profiles")
  ├── M:N Allergy (related_name="profiles")
  └── M:N DietaryRestriction (related_name="profiles")
```

This represents normalized lookup tables for health filters rather than storing raw text strings.

------------------------------------------------------------------------

# 6. Meals App

This represents the central domain model.

## 6.1 MealLog

Structure:

  Field             Type
  ----------------- -------------------------------------
  id                Integer (Auto-Increment)
  user              FK CustomUser (related_name="meals")
  meal_type         CharField (MealTypeChoices)
  description       TextField nullable
  image             ImageField nullable (upload_to="meal_photos/")
  created_at        DateTimeField
  updated_at        DateTimeField

`MealTypeChoices` are:

``` text
BREAKFAST
LUNCH
DINNER
SNACK
```

AI analysis status is determined on the fly (i.e. whether a related `TotalFoodAnalysis` exists). If analysis fails due to service timeouts or errors during the synchronous request, views return a `502 Bad Gateway` or `400 Bad Request` error to the client, preventing partial/incorrect data from being persisted.

## 6.2 MealFoodItems

Each individual food item identified within a meal log. Stored in the `MealFoodItems` class.

Fields:

  Field               Type
  ------------------ ------------------------------------------------
  id                  Integer (Auto-Increment)
  food_analysis       FK TotalFoodAnalysis (related_name="food_items")
  food_name           CharField
  food_quantity       Float
  food_quantity_unit  CharField (default="g")
  food_calories       Float
  food_protein        Float
  food_carbs          Float
  food_fats           Float
  created_at          DateTimeField
  updated_at          DateTimeField

**Design note:** In the actual database, `MealFoodItems` stores food names directly as a `CharField` (e.g. "Cooked Rice") rather than linking via a ForeignKey to the `FoodItem` table of the `nutritiion` app. The vector database (ChromaDB) manages semantic searches on the AI service side, and the calculated item-level nutrition values are sent back to Django to be recorded.

This creates a valid historical snapshot. If a master food item's nutrition profile is updated later in the nutrition database, old meals logged in the database remain unchanged, maintaining historical integrity.

------------------------------------------------------------------------

## 6.3 TotalFoodAnalysis

One-to-one with MealLog.

``` text
MealLog 1 ─── 1 TotalFoodAnalysis
```

Fields:

  Field            Type
  ---------------- ---------------------------------
  id               Integer (Auto-Increment)
  meal             OneToOne MealLog (related_name="analysis")
  total_calories   Float
  total_protein    Float
  total_carbs      Float
  total_fats       Float
  created_at       DateTimeField
  updated_at       DateTimeField

These totals are computed by the FastAPI service (summing up item-level values) and returned to Django, which saves them directly.

------------------------------------------------------------------------

# 7. Nutritiion App

This app (spelled `nutritiion` with double 'ii' in the codebase path) owns the authoritative master active food and alias catalog.

## 7.1 FoodItem

This is the authoritative master nutrition entity.

Fields:

  Field                    Type
  ------------------------ --------------------------
  id                       Integer (Auto-Increment)
  name                     CharField (unique)
  description              TextField nullable
  serving_unit             CharField nullable
  calories_per_100g        DecimalField
  protein_per_100g         DecimalField
  carbs_per_100g           DecimalField
  fat_per_100g             DecimalField
  fiber_per_100g           DecimalField nullable
  source                   CharField nullable
  is_active                BooleanField (default=True)
  created_at               DateTimeField
  updated_at               DateTimeField

## 7.2 FoodAlias

Used for local/colloquial food-name matching, semantic search, and typeahead search.

Fields:

  Field          Type
  -------------- ------------------------------------------------
  id             Integer (Auto-Increment)
  food_item      FK FoodItem (related_name="food_aliases")
  alias          CharField
  language       CharField (default="en")
  is_active      BooleanField (default=True)
  created_at     DateTimeField
  updated_at     DateTimeField

Example mapping:

``` text
FoodItem:
    White Rice

FoodAlias:
    bhat (lang="ne")
    rice (lang="en")
    chawal (lang="ne")
```

## 7.3 ChromaDB relationship

ChromaDB is a derived AI index seeded from a copy of this master nutrition data (`master_database.json`).

ChromaDB stores:

``` text
embedding
food_id (corresponds to name/canonical ID)
searchable text (name and aliases)
metadata (including nutrition_per_gram, restrictions, and category details)
```

The FastAPI `FoodMatchingService` performs similarity search on ChromaDB, computes portion weights, retrieves calorie/macro metrics from the matched metadata, and returns the calculated results to Django.

------------------------------------------------------------------------

# 8. MealRecommendation Model (inside Meals App)

Rather than having a separate app, meal recommendations are stored inside the `meals` app using the `MealRecommendation` model.

Fields:

  Field                        Type
  ---------------------------- -----------------------------------------
  id                           Integer (Auto-Increment)
  meal                         OneToOne MealLog (related_name="recommendation")
  overall_verdict              CharField
  summary                      TextField
  macro_assessment             JSONField
  health_and_dietary_alerts    JSONField
  actionable_suggestions       JSONField
  alternative_foods            JSONField
  model_name                   CharField
  generated_at                 DateTimeField nullable
  created_at                   DateTimeField
  updated_at                   DateTimeField

`macro_assessment` stores evaluation strings for calories, protein, carbs, and fats. `health_and_dietary_alerts`, `actionable_suggestions`, and `alternative_foods` store structured JSON arrays generated by the local Ollama LLM (`qwen2.5:3b`) and validated against FastAPI's Pydantic schemas.

------------------------------------------------------------------------

# 9. Progress App (Planned/Future Feature)

A separate progress tracking app and weight history models are planned but **not currently implemented** in either backend or frontend codebases. The core focus of the system is the meal logging, image analysis, and recommendation pipeline.

Planned schema for progress tracking:

-   **ProgressEntry**: `id` (int), `user` (FK CustomUser), `weight_kg` (Decimal), `date` (Date), `notes` (Text), `created_at` (DateTime).
-   BMI is calculated dynamically on the frontend:
    ``` text
    BMI = weight_kg / (height_cm / 100)²
    ```
-   Daily history can be derived by aggregating `TotalFoodAnalysis` over `MealLog.created_at`.

------------------------------------------------------------------------

# 10. Final Entity Relationship Structure

``` mermaid
erDiagram
    CUSTOM_USER ||--|| USER_PROFILE : profile
    CUSTOM_USER ||--o{ MEAL_LOG : meals

    USER_PROFILE }o--o{ MEDICAL_CONDITION : medical_conditions
    USER_PROFILE }o--o{ ALLERGY : allergies
    USER_PROFILE }o--o{ DIETARY_RESTRICTION : dietary_restrictions

    MEAL_LOG ||--|| TOTAL_FOOD_ANALYSIS : analysis
    TOTAL_FOOD_ANALYSIS ||--o{ MEAL_FOOD_ITEMS : food_items
    MEAL_LOG ||--o? MEAL_RECOMMENDATION : recommendation

    FOOD_ITEM ||--o{ FOOD_ALIAS : food_aliases
```

The ERD shows # 11. Data Ownership

The ownership hierarchy is:

``` text
CustomUser
│
├── UserProfile
│     ├── MedicalConditions
│     ├── Allergies
│     └── DietaryRestrictions
│
└── MealLog
      ├── MealFoodItems
      ├── TotalFoodAnalysis
      └── MealRecommendation
```

Nutrition master data is **not user-owned**:

``` text
FoodItem
FoodAlias
```

It is application-owned.

------------------------------------------------------------------------

# 12. User Isolation

Every user-owned queryset must be scoped to the authenticated user.

Correct:

``` text
MealLog.objects.filter(user=request.user)
```

Incorrect:

``` text
MealLog.objects.all()
```

The same principle applies to:

``` text
UserProfile
MealLog
MealRecommendation
```

For nested resources, ownership must be inherited from the parent.

For example:

``` text
GET /api/meals/{meal_id}/
```

must retrieve:

``` text
MealLog.objects.filter(
    id=meal_id,
    user=request.user
)
```

not:

``` text
MealLog.objects.get(id=meal_id)
```

This prevents cross-user data leakage.

------------------------------------------------------------------------

# 13. Django Internal Architecture

The final request pipeline is:

``` text
HTTP Request
     │
     ▼
URL Router
     │
     ▼
JWT Authentication
     │
     ▼
Permission Check
     │
     ▼
View / APIView
     │
     ▼
Serializer Validation
     │
     ▼
Service Function
     │
     ▼
Django ORM
     │
     ▼
SQLite / PostgreSQL
     │
     ▼
Response Serializer
     │
     ▼
HTTP Response
```

But **not every request needs a service layer**.

### Simple operation

``` text
View
 ↓
Serializer
 ↓
ORM
```

### Complex operation

``` text
View
 ↓
Serializer
 ↓
MealAnalysisService / MealRecommendationService
 ↓
FastAPI
 ↓
ORM
```

Use services only for actual workflows.

------------------------------------------------------------------------

# 14. Recommended Django Service Layer

The service files implemented in the codebase are:

``` text
backend/apps/meals/meal_analysis_service.py

    analyze_meal_image(meal)
    analyze_meal_text(meal)

backend/apps/meals/meal_recommendation_service.py

    assemble_recommendation_payload(meal)
    generate_and_save_meal_recommendation(meal)
```

No other service modules (such as profile validators or progress calculators) are implemented. Model constraint validations are handled directly by serializers, and views interface directly with these core meal services to orchestrate AI analysis and recommendations.

------------------------------------------------------------------------

# 15. Serializers

## Accounts

``` text
CustomUser register and login serializers
```

### Important behavior

Password fields are:

``` text
write_only=True
```

and must always use Django's password hashing helper.

------------------------------------------------------------------------

## Profiles

``` text
UserProfileSerializer
MedicalConditionSerializer
AllergySerializer
DietaryRestrictionSerializer
```

`user` should be `read_only` to prevent changing the owner of a profile via request payloads.

------------------------------------------------------------------------

## Meals

``` text
MealLogSerializer
MealFoodItemSerializer (maps to MealFoodItems model)
TotalFoodAnalysisSerializer
MealRecommendationSerializer (maps to MealRecommendation model)
```

### MealLogSerializer

Client can submit:

``` text
meal_type
description
image
```

Server controls:

``` text
user
analysis (TotalFoodAnalysisSerializer)
recommendation (MealRecommendationSerializer)
timestamps
```

### MealFoodItemSerializer

AI-generated values are read-only. The frontend cannot arbitrarily submit food items or modify nutritional values directly.

------------------------------------------------------------------------

## Nutritiion

``` text
FoodItemSerializer
FoodAliasSerializer
```

These are used for looking up food item details and active aliases, as well as searching from the manual log input flow. Normal users only have read-only access.

------------------------------------------------------------------------

# 16. API Architecture

The API uses `/api/` prefix.

Final structure:

``` text
/api/token/
/api/token/refresh/

/api/accounts/
/api/profiles/
/api/meals/
/api/nutrition/
```

There are no separate `/api/recommendations/` or `/api/progress/` url endpoints mapped.

------------------------------------------------------------------------

# 17. Authentication Endpoints

  Method   Endpoint                    Purpose                Auth
  -------- --------------------------- ---------------------- ---------------
  POST     `/api/accounts/register/`   Register               No
  POST     `/api/accounts/login/`      Login                  No
  POST     `/api/token/`               Obtain JWT pair        No
  POST     `/api/token/refresh/`       Refresh access token   Refresh token

------------------------------------------------------------------------

# 18. Profile Endpoints

  Method   Endpoint                             Purpose
  -------- ------------------------------------ ----------------------------
  GET      `/api/profiles/user-profile/`        Get current user's profile
  POST     `/api/profiles/user-profile/`        Create profile
  PATCH    `/api/profiles/user-profile/`        Update profile
  GET      `/api/profiles/medical-conditions/`  List medical conditions
  GET      `/api/profiles/allergies/`           List allergies
  GET      `/api/profiles/dietary-restrictions/`List dietary restrictions

All require JWT. No user ID should be included in the URL to preserve user isolation.

------------------------------------------------------------------------

# 19. Meal Endpoints

  Method   Endpoint                               Purpose
  -------- -------------------------------------- -----------------------------
  GET      `/api/meals/`                          List user's meals with analysis
  POST     `/api/meals/`                          Create meal log (runs analysis)
  GET      `/api/meals/<int:meal_id>/`            Retrieve specific meal log
  PATCH    `/api/meals/<int:meal_id>/`            Update meal log
  DELETE   `/api/meals/<int:meal_id>/`            Delete meal log
  POST     `/api/meals/<int:meal_id>/analyze/`    Manually trigger/re-run AI analysis
  POST     `/api/meals/<int:meal_id>/recommendation/` Generate/re-generate recommendation
  GET      `/api/meals/<int:meal_id>/recommendation/` Fetch stored recommendation

------------------------------------------------------------------------

# 20. Nutrition Endpoints

Expose active canonical food items and aliases:

  Method   Endpoint                             Purpose
  -------- ------------------------------------ -----------------------------
  GET      `/api/nutrition/foods/`              List/search active foods (e.g. `?search=bhat`)
  GET      `/api/nutrition/foods/<int:pk>/`     Retrieve specific food details

These support manual food selection/search from the UI. Admin operations are managed via Django admin.

------------------------------------------------------------------------

# 21. Recommendation Endpoints

Recommendations are retrieved and generated via nested meal endpoints to preserve strict meal-based ownership boundaries:

``` text
POST /api/meals/<int:meal_id>/recommendation/
GET  /api/meals/<int:meal_id>/recommendation/
```

Django verifies `meal.user == request.user` before forwarding any context to FastAPI or Ollama.

------------------------------------------------------------------------

# 22. Progress Endpoints (Planned Future Feature)

Progress endpoints are planned but not currently implemented:

``` text
GET    /api/progress/          (Planned)
POST   /api/progress/          (Planned)
PATCH  /api/progress/<id>/     (Planned)
DELETE /api/progress/<id>/     (Planned)
```

Currently, weight log data and daily/weekly trends are calculated on-the-fly or deferred.

------------------------------------------------------------------------

# 23. Dashboard Endpoint

Do **not** create a Dashboard API endpoint or database model.

The dashboard is composed entirely on the frontend React client using existing endpoints:

``` text
GET /api/profiles/user-profile/
GET /api/meals/
```

The React dashboard client filters, aggregates, and renders today's logs, total daily nutrients, and recent recommendations dynamically.

------------------------------------------------------------------------

# 24. API Response Formatxt
GET /api/dashboard/
```

But this should only be introduced after the frontend demonstrates that
several requests are actually problematic.

Initial implementation:

``` text
profile API
meal API
progress API
recommendation API
```

The React dashboard combines them.

------------------------------------------------------------------------

# 24. API Response Format

Use consistent successful responses.

### Resource

``` json
{
    "id": "..."
}
```

### List

Use DRF pagination.

``` json
{
    "count": 25,
    "next": "...",
    "previous": null,
    "results": []
}
```

Do not invent another pagination system.

------------------------------------------------------------------------

# 25. Error Format

Use one application-level error shape:

``` json
{
    "error": {
        "code": "INVALID_MEAL",
        "message": "The submitted meal data is invalid.",
        "details": {}
    }
}
```

Examples:

``` json
{
    "error": {
        "code": "AI_SERVICE_UNAVAILABLE",
        "message": "Meal analysis is temporarily unavailable.",
        "details": {}
    }
}
```

``` json
{
    "error": {
        "code": "MEAL_NOT_FOUND",
        "message": "Meal not found.",
        "details": {}
    }
}
```

For ordinary DRF validation, retaining field-level details is useful:

``` json
{
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Invalid request data.",
        "details": {
            "meal_type": [
                "This field is required."
            ]
        }
    }
}
```

------------------------------------------------------------------------

# 26. Registration Workflow

``` mermaid
sequenceDiagram
    participant U as User
    participant R as React
    participant D as Django
    participant DB as PostgreSQL

    U->>R: Enter registration data
    R->>D: POST /api/accounts/register/
    D->>D: Validate request
    D->>DB: Check email uniqueness
    DB-->>D: Available
    D->>D: Hash password
    D->>DB: Create CustomUser
    DB-->>D: User created
    D-->>R: Registration response
    R-->>U: Registration successful
```

------------------------------------------------------------------------

# 27. Login Workflow

``` mermaid
sequenceDiagram
    participant U as User
    participant R as React
    participant D as Django
    participant DB as PostgreSQL

    U->>R: Enter email/password
    R->>D: POST /api/accounts/login/
    D->>DB: Authenticate user
    DB-->>D: Valid credentials
    D->>D: Generate JWT
    D-->>R: Access + refresh tokens
    R-->>U: Authenticated application
```

------------------------------------------------------------------------

# 28. Profile Workflow

``` mermaid
sequenceDiagram
    participant R as React
    participant D as Django
    participant DB as PostgreSQL

    R->>D: PATCH /api/profiles/user-profile/
    D->>D: Authenticate JWT
    D->>D: Validate profile
    D->>DB: Update UserProfile
    DB-->>D: Updated profile
    D-->>R: Profile response
```

------------------------------------------------------------------------

# 29. Manual Meal Logging

The manual logging flow supports text descriptions:

``` text
User enters description
  ↓
React
  ↓
POST /api/meals/
  ↓
JWT authentication
  ↓
MealLog creation (description)
  ↓
Django invokes analyze_meal_text()
  ↓
FastAPI POST /api/food/analyze-text
  ↓
FastAPI parses text & matches ChromaDB food items
  ↓
FastAPI calculates nutrition & aggregates totals
  ↓
Django receives structured analysis
  ↓
MealFoodItems and TotalFoodAnalysis persisted
  ↓
Response to React
```

During text analysis, FastAPI's `TextFoodAnalysisService` parses natural language text, extracts quantities using regular expressions (extracting weight metrics or portional references like plates, bowls, cups, katoras, or rotis), resolves canonical foods using token-level rapidfuzz fuzzy logic and ChromaDB embedding searches, and calculates nutritional totals before returning them to Django.

------------------------------------------------------------------------

# 30. Image Meal Analysis

This is the central AI workflow.

``` mermaid
sequenceDiagram
    participant U as User
    participant R as React
    participant D as Django
    participant DB as SQLite / PostgreSQL
    participant F as FastAPI
    participant Y as YOLO
    participant C as ChromaDB

    U->>R: Upload meal image
    R->>D: POST /api/meals/ (multipart)
    D->>D: Authenticate JWT
    D->>D: Validate image
    D->>DB: Create MealLog
    D->>F: POST /api/food/analyze (image bytes)

    F->>Y: Run YOLOv8 segmentation
    Y-->>F: class_id + label + mask + confidence

    F->>F: Estimate portion weight (QuantityService)
    F->>C: Semantic food lookup (FoodMatchingService)
    C-->>F: food_id + similarity + metadata

    F->>F: Compute itemized and total nutrition macros
    F-->>D: Structured JSON response

    D->>D: Validate response structure
    D->>DB: Bulk create MealFoodItems
    D->>DB: Save TotalFoodAnalysis
    D-->>R: Return meal result
    R-->>U: Display nutrition
```

------------------------------------------------------------------------

# 31. Important Data Boundary in Meal Analysis

The AI service performs portion scaling and nutrition lookup (retrieving calories and macros per gram from ChromaDB metadata) and returns the completed itemized and aggregated calculations:

``` json
{
  "success": true,
  "foods": [
    {
      "food_id": "bhat",
      "name": "Cooked Rice",
      "detected_label": "bhat",
      "confidence": 0.92,
      "quantity": 150.0,
      "unit": "g",
      "calories": 195.0,
      "protein": 4.05,
      "carbs": 42.3,
      "fat": 0.45
    }
  ],
  "total": {
    "calories": 195.0,
    "protein": 4.05,
    "carbs": 42.3,
    "fat": 0.45
  }
}
```

Django receives this pre-calculated payload and maps the fields directly to its database models:

-   `total_calories`, `total_protein`, `total_carbs`, and `total_fats` are saved to the `TotalFoodAnalysis` model.
-   Itemized food results are saved as individual records in the `MealFoodItems` table.

This creates a clear data boundary where the FastAPI service acts as the ML computing engine, and Django operates as the primary validator and storage gatekeeper.

------------------------------------------------------------------------

# 32. FastAPI Responsibilities

The FastAPI project structure is structured as:

``` text
ai-service/
├── app/
│   ├── main.py
│   │
│   ├── api/
│   │   ├── routes/
│   │   │   ├── food.py
│   │   │   └── recommendation.py
│   │
│   ├── services/
│   │   ├── yolo_service.py
│   │   ├── quantity_service.py
│   │   ├── food_matching_service.py
│   │   ├── text_food_analysis_service.py
│   │   ├── image_food_analysis_service.py
│   │   └── recommendation_service.py
│   │
│   └── schemas/
│       ├── food.py
│       └── recommendation.py
│
├── models/
│   └── yolo/
│       └── best.pt
│
├── chroma_db/
│   └── chroma.sqlite3
│
└── data/
    └── master_database.json
```

------------------------------------------------------------------------

# 33. FastAPI Meal Analysis Contracts

## Endpoints

-   **Image Analysis:** `POST /api/food/analyze` (multipart/form-data upload with `image` file)
-   **Text Analysis:** `POST /api/food/analyze-text` (JSON payload `{"text": "<description>"}`)

FastAPI operates internally on localhost (port 8001). Communication is unauthenticated in the development environment.

------------------------------------------------------------------------

# 34. FastAPI Responses

The responses conform to Pydantic validation schemas in `app/schemas/food.py`:

### Image Analysis Response (`FoodImageAnalysisResponse`)

``` json
{
  "success": true,
  "foods": [
    {
      "food_id": "bhat",
      "name": "Cooked Rice",
      "detected_label": "bhat",
      "confidence": 0.92,
      "quantity": 150.0,
      "unit": "g",
      "calories": 195.0,
      "protein": 4.05,
      "carbs": 42.3,
      "fat": 0.45,
      "veg_or_nonveg": "veg",
      "fitness_direction": "maintain_weight",
      "health_restrictions": {},
      "social_restrictions": {}
    }
  ],
  "total": {
    "calories": 195.0,
    "protein": 4.05,
    "carbs": 42.3,
    "fat": 0.45
  }
}
```

### Text Analysis Response (`FoodTextAnalysisResponse`)

``` json
{
  "foods": [
    {
      "food_id": "dal",
      "name": "Cooked Lentils",
      "matched_alias": "dal",
      "quantity": 150.0,
      "unit": "g",
      "calories": 174.0,
      "protein": 13.5,
      "carbs": 30.15,
      "fat": 0.6,
      "veg_or_nonveg": "veg",
      "fitness_direction": "maintain_weight",
      "health_restrictions": {},
      "social_restrictions": {}
    }
  ],
  "total": {
    "calories": 174.0,
    "protein": 13.5,
    "carbs": 30.15,
    "fat": 0.6
  }
}
```

------------------------------------------------------------------------

# 35. AI Result Validation

The FastAPI service validates image payloads using Pillow and text requests using Pydantic parameters. Django handles HTTP communication errors (connection timeouts, request failures, or malformed JSON payloads) by raising exceptions in its service modules, returning appropriate REST API error responses (e.g. `502 Bad Gateway`) to the client, preventing incomplete analyses from being persisted.

------------------------------------------------------------------------

# 36. FastAPI Authentication

In the local environment, the AI service communicates over loopback network interfaces without explicit authorization checks, facilitating development and testing.

------------------------------------------------------------------------

# 37. FastAPI Timeout

Default connection timeouts configured on the HTTP client:

-   **Image analysis:** 60.0 seconds
-   **Text analysis:** 30.0 seconds
-   **Recommendation generation:** 300.0 seconds (due to LLM inference latency)

------------------------------------------------------------------------

# 38. AI Failure Handling

If communication fails, the Django API endpoint catches the exception, logs the details, and returns a detailed `502 Bad Gateway` error to the client, keeping the database consistent.

------------------------------------------------------------------------

# 39. Recommendation Workflow

``` mermaid
sequenceDiagram
    participant R as React
    participant D as Django
    participant DB as SQLite / PostgreSQL
    participant F as FastAPI
    participant L as Ollama LLM

    R->>D: POST /api/meals/<meal_id>/recommendation/
    D->>D: Authenticate JWT
    D->>D: Verify meal owner
    D->>DB: Fetch meal, analysis, and user profile (with conditions, allergies, restrictions)
    D->>D: Assemble RecommendationRequest payload
    D->>F: POST /api/recommendation/generate (JSON context)

    F->>F: Build prompt template with meal details and constraints
    F->>L: POST /api/generate (format="json", temperature=0.2)
    L-->>F: JSON string response

    F->>F: Clean JSON and validate schema (RecommendationDetail)
    F-->>D: Return validated recommendation details

    D->>DB: Update/Create MealRecommendation record
    D-->>R: Return serialization
```

------------------------------------------------------------------------

# 40. Recommendation AI Contract

Django constructs and POSTs the `RecommendationRequest` payload:

``` json
{
  "meal_id": 1,
  "meal_type": "LUNCH",
  "logged_at": "2026-08-21T08:47:12Z",
  "description": "Dal bhat tarkari meal",
  "nutrition_summary": {
    "total_calories": 800.0,
    "total_protein": 35.0,
    "total_carbs": 120.0,
    "total_fats": 10.0
  },
  "food_items": [
    {
      "name": "Cooked Rice",
      "quantity_grams": 300.0,
      "calories": 390.0,
      "protein": 8.0,
      "carbs": 85.0,
      "fat": 1.0,
      "veg_or_nonveg": "",
      "fitness_direction": "",
      "health_warnings": []
    }
  ],
  "user_profile": {
    "age": 30,
    "gender": "MALE",
    "height_cm": 175.0,
    "weight_kg": 78.0,
    "target_weight_kg": 72.0,
    "activity_level": "MODERATE",
    "fitness_goal": "LOSE_WEIGHT",
    "dietary_preference": "NON_VEGETARIAN",
    "medical_conditions": ["Type 2 Diabetes"],
    "allergies": ["Peanuts"],
    "dietary_restrictions": ["Low Sugar / Diabetic Diet"]
  }
}
```

------------------------------------------------------------------------

# 41. LLM Response Schema

FastAPI cleans and validates the output generated by the Ollama model (`qwen2.5:3b`) using Pydantic `RecommendationDetail`:

``` json
{
  "meal_id": 1,
  "overall_verdict": "NEEDS_IMPROVEMENT",
  "summary": "High carbohydrate portion for weight loss and Type 2 Diabetes.",
  "macro_assessment": {
    "calories_evaluation": "800 kcal is slightly high for lunch.",
    "protein_evaluation": "Good protein intake (35g).",
    "carbs_evaluation": "120g carbs is high for glycemic control.",
    "fats_evaluation": "Fats are low (10g)."
  },
  "health_and_dietary_alerts": [
    {
      "type": "MEDICAL_RESTRICTION",
      "severity": "WARNING",
      "message": "High rice portion may cause rapid glucose elevation."
    }
  ],
  "actionable_suggestions": [
    "Reduce cooked rice to 150g.",
    "Add green leafy saag for fiber."
  ],
  "alternative_foods": [
    {
      "recommended_food": "Brown Rice or Chiura",
      "replaces": "Cooked White Rice",
      "reason": "Lower glycemic index."
    }
  ],
  "model_name": "qwen2.5:3b",
  "generated_at": "2026-08-21T08:47:12.459762Z"
}
```

------------------------------------------------------------------------

# 42. Constraint Processing

Health metrics (medical conditions, allergies, and dietary restrictions) are owned and persisted in Django's relational database. During a recommendation request, these constraints are queried from `UserProfile` and nested tables, packaged into the JSON payload context, and sent to FastAPI. FastAPI compiles them into the prompt instructions, enabling the local Ollama LLM to align the advice.

------------------------------------------------------------------------

# 43. Nutrition Calculation Pipeline

``` text
ChromaDB Food Metadata (nutrition per gram)
                   │
                   ▼
Portion weight grams (estimated via geometry or text regex)
                   │
                   ▼
FastAPI computes item-level calories, protein, carbs, and fats
                   │
                   ▼
FastAPI aggregates totals (Total calories, protein, carbs, fats)
                   │
                   ▼
Django receives, validates, and persists TotalFoodAnalysis & MealFoodItems
```

This pipeline is deterministic.

------------------------------------------------------------------------

# 44. Portion Estimation Boundary

Portion sizes are computed on the FastAPI service side:
- **Image flow:** estimated in `QuantityService` using segmentation mask areas, plate calibrations, food density multipliers, and geometrical shapes.
- **Text flow:** extracted in `TextFoodAnalysisService` using regex lookbacks for weight indicators or portion terms (e.g. plates, bowls, cups, pieces).

Django performs schema validation, binds records to users, and persists these values in the database.

------------------------------------------------------------------------

# 45. Meal Processing State

The system uses a synchronous execution model. During requests, the frontend displays standard processing indicators. If the request completes successfully, the serialized meal details are returned. If an error occurs, the endpoint returns a `502 Bad Gateway` error and no data is saved, keeping the database consistent.

------------------------------------------------------------------------

# 46. JWT Authentication Architecture

The flow remains:

``` text
Login
  ↓
Django
  ↓
Access Token + Refresh Token
  ↓
React
  ↓
Protected Request
  ↓
Django JWT Authentication
```

When access expires:

``` text
API → 401
      ↓
React refresh request
      ↓
POST /api/token/refresh/
      ↓
New access token
      ↓
Retry original request
```

Access and refresh tokens are stored in the client application context.

------------------------------------------------------------------------

# 47. Logout

If using refresh-token rotation/blacklisting:

``` text
React
 ↓
Logout
 ↓
Django
 ↓
Invalidate refresh token/session state
```

Then clear client-side authentication state.

The exact blacklist configuration can be enabled once the current JWT
flow is stabilized.

------------------------------------------------------------------------

# 48. React Architecture

Keep it simple.

``` text
src/
├── api/
│   ├── client.js
│   ├── auth.js
│   ├── profiles.js
│   ├── meals.js
│   ├── recommendations.js
│   └── progress.js
│
├── components/
│   ├── common/
│   ├── meals/
│   ├── profile/
│   └── recommendations/
│
├── pages/
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── Dashboard.jsx
│   ├── Profile.jsx
│   ├── MealLog.jsx
│   ├── MealDetail.jsx
│   ├── Recommendations.jsx
│   └── Progress.jsx
│
├── context/
│   └── AuthContext.jsx
│
├── routes/
│   └── AppRoutes.jsx
│
└── utils/
```

No Redux is required initially.

No complex state-management architecture is required.

------------------------------------------------------------------------

# 49. React Pages

## Public

``` text
/
 /login
 /register
```

## Authenticated

``` text
/dashboard
/profile
/meals
/meals/:id
/recommendations
/progress
```

------------------------------------------------------------------------

# 50. React Meal Upload Flow

``` text
MealLog.jsx
    ↓
select image
    ↓
client validation
    ↓
POST /api/meals/
    ↓
display processing
    ↓
receive result/error
    ↓
navigate to MealDetail
```

Client validation should check:

-   file exists
-   MIME type
-   reasonable file size

But Django must validate again.

Never rely on frontend validation for security.

------------------------------------------------------------------------

# 51. Dashboard Architecture

The dashboard should initially be composed from existing data:

``` text
Profile
+
Today's meals
+
Today's nutrition
+
Latest recommendation
+
Recent progress
```

No dashboard database table.

Example:

``` text
GET /api/meals/?date=today
GET /api/profiles/user-profile/
GET /api/recommendations/?limit=1
GET /api/progress/summary/
```

If this becomes too many requests, consolidate later.

------------------------------------------------------------------------

# 52. Frontend Loading States

Every API-driven page should explicitly support:

``` text
loading
success
empty
error
```

Meal analysis additionally supports:

``` text
processing
failed
```

This maps directly to the backend state model.

------------------------------------------------------------------------

# 53. Django Project Structure

Final recommended structure:

``` text
backend/
│
├── manage.py
│
├── config/
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
│
├── apps/
│   │
│   ├── accounts/
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── admin.py
│   │   ├── tests/
│   │   └── migrations/
│   │
│   ├── profiles/
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── services.py
│   │   ├── tests/
│   │   └── migrations/
│   │
│   ├── meals/
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── services.py
│   │   ├── permissions.py
│   │   ├── tests/
│   │   └── migrations/
│   │
│   ├── nutrition/
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── admin.py
│   │   ├── services.py
│   │   └── migrations/
│   │
│   ├── recommendations/
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── services.py
│   │   ├── tests/
│   │   └── migrations/
│   │
│   └── progress/
│       ├── models.py
│       ├── serializers.py
│       ├── views.py
│       ├── urls.py
│       ├── services.py
│       ├── tests/
│       └── migrations/
│
├── integrations/
│   └── ai_service/
│       ├── client.py
│       ├── schemas.py
│       └── exceptions.py
│
├── media/
│
├── requirements.txt
└── .env
```

### Why `integrations/ai_service`?

This is the one additional boundary that is genuinely useful.

It keeps:

``` text
HTTP calls
timeouts
service authentication
FastAPI response validation
```

out of Django views.

It is **not** a generic repository/factory abstraction.

------------------------------------------------------------------------

# 54. AI Integration Module

``` text
integrations/
└── ai_service/
    ├── client.py
    ├── schemas.py
    └── exceptions.py
```

Responsibilities:

### `client.py`

``` text
call meal-analysis endpoint
call recommendation endpoint
handle timeout
handle connection errors
```

### `schemas.py`

Defines the expected AI response.

### `exceptions.py`

Defines only AI integration errors.

This creates a clean boundary:

``` text
Meals Service
      ↓
AI Client
      ↓
FastAPI
```

------------------------------------------------------------------------

# 55. FastAPI Project Structure

``` text
ai-service/
├── app/
│   ├── main.py
│   │
│   ├── api/
│   │   ├── routes/
│   │   │   ├── food.py
│   │   │   └── recommendation.py
│   │
│   ├── services/
│   │   ├── yolo_service.py
│   │   ├── quantity_service.py
│   │   ├── food_matching_service.py
│   │   ├── text_food_analysis_service.py
│   │   ├── image_food_analysis_service.py
│   │   └── recommendation_service.py
│   │
│   └── schemas/
│       ├── food.py
│       └── recommendation.py
│
├── models/
│   └── yolo/
│       └── best.pt
│
├── chroma_db/
│   └── chroma.sqlite3
│
└── data/
    └── master_database.json
```

------------------------------------------------------------------------

# 56. Configuration

## Django Configuration Parameters

``` text
SECRET_KEY = <secret key>
DEBUG = True / False
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "*"]
CORS_ALLOWED_ORIGINS = ["http://localhost:5173"]

AI_SERVICE_URL = "http://127.0.0.1:8001"
```

## FastAPI Configuration Parameters

``` text
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "qwen2.5:3b"
OLLAMA_TIMEOUT = 300.0
```

Nothing secret goes into Git. Secrets should be managed using environment variables.

------------------------------------------------------------------------

# 57. Database Configuration

Local Development:
``` text
SQLite (backend/db.sqlite3)
```

Production Target:
``` text
PostgreSQL
```

Django is the only service directly accessing the application database. FastAPI should not directly connect to Django's application database for ordinary AI inference, preserving clean application and service boundaries.

------------------------------------------------------------------------

# 58. ChromaDB Architecture

ChromaDB is a derived AI index.

``` text
master_database.json
        ↓
Embedding generation (generate_embedding.py script using HuggingFaceEmbeddings)
        ↓
ChromaDB
```

Metadata stored in ChromaDB:

``` json
{
    "id": "bhat",
    "name": "Cooked Rice",
    "veg_or_nonveg": "veg",
    "fitness_direction": "maintain_weight",
    "nutrition_per_gram": {
        "calories": 1.3,
        "protein": 0.027,
        "carbs": 0.28,
        "fat": 0.003
    },
    "health_restrictions": {},
    "social_restrictions": {},
    "other_names": ["bhat", "rice", "white rice"]
}
```

Query:

``` text
"bhat"
```

Result:

``` text
id = "bhat"
name = "Cooked Rice"
score = 0.08
nutrition_per_gram = {...}
```

Then FastAPI uses these parameters to estimate weights and calculate macros, returning pre-calculated totals to Django.

------------------------------------------------------------------------

# 59. File Storage

Meal images are stored on the local filesystem.

Use:

``` text
SQLite / PostgreSQL
    stores image file path/reference in MealLog.image

Local File Storage (backend/media/meal_photos/)
    stores the actual image files
```

Development:

``` text
backend/media/meal_photos/
```

Production can use object storage later. The Django media configuration decouples actual file storage from the database schemas.

------------------------------------------------------------------------

# 60. Image Security

Django should validate:

-   file extension
-   MIME type
-   file size
-   image decoding
-   dimensions

Recommended initial limits:

``` text
Allowed:
JPEG
PNG
WEBP

Reject:
executables
SVG unless explicitly required
unknown binary files
```

The image should be processed as untrusted input.

FastAPI should independently validate the image before inference.

------------------------------------------------------------------------

# 61. Error Handling Matrix

  Failure                   Handler                Response
  ------------------------- ---------------------- ----------------------
  Invalid JWT               Django                 401
  Expired JWT               Django/React refresh   401 then refresh
  Not owner                 Django                 404/403
  Invalid serializer data   Django                 400
  Missing resource          Django                 404
  Invalid image             Django                 400
  Image too large           Django                 413
  FastAPI unavailable       Django                 502
  FastAPI timeout           Django                 504/502
  Invalid AI response       Django                 502
  Chroma failure            FastAPI                503
  LLM failure               FastAPI                graceful degradation
  DB failure                Django                 500
  Unexpected exception      owning service         500

For ownership-sensitive endpoints, returning `404` for an object outside
the user's queryset is often preferable because it does not reveal that
another user's resource exists.

------------------------------------------------------------------------

# 62. Duplicate Requests

For meal analysis, accidental double-clicks can create duplicate
requests.

The frontend should disable the submit button while processing.

The backend should additionally use the meal record itself as the unit
of processing.

A meal should not be analyzed twice concurrently.

At minimum:

``` text
NOT_ANALYZED → PROCESSING
```

must happen before the FastAPI request.

A second request sees:

``` text
PROCESSING
```

and should not start another analysis.

------------------------------------------------------------------------

# 63. Logging

Do not build a large observability platform.

Django should log:

``` text
request errors
authentication failures
AI service failures
meal analysis failures
unexpected exceptions
```

FastAPI should log:

``` text
inference duration
model errors
Chroma errors
LLM errors
invalid AI responses
```

Do not log:

``` text
passwords
JWTs
service secrets
full sensitive health information
```

A request ID can be introduced:

``` text
X-Request-ID
```

if debugging distributed requests becomes difficult.

------------------------------------------------------------------------

# 64. Security Architecture

## Authentication

``` text
JWT
```

## Authorization

``` text
IsAuthenticated
+
ownership filtering
```

## Passwords

Django password hashing.

## CORS

Allow only the deployed React origin.

Development:

``` text
localhost frontend
```

Production:

``` text
actual frontend domain
```

Do not use:

``` text
CORS_ALLOW_ALL_ORIGINS = True
```

in production.

## CSRF

Because the frontend uses JWT for API authentication, normal
bearer-token API requests do not rely on Django session authentication.

If refresh tokens are stored in HttpOnly cookies, configure CSRF
protection appropriately for that cookie-based operation.

------------------------------------------------------------------------

# 65. Health Data Security

The project stores:

``` text
age
weight
height
medical conditions
allergies
dietary restrictions
```

These must be treated as sensitive application data.

Primary controls:

``` text
JWT authentication
+
ownership filtering
+
HTTPS
+
password hashing
+
restricted admin access
+
secret management
```

The project scope remains wellness-oriented rather than clinical
diagnosis or treatment.

------------------------------------------------------------------------

# 66. Deployment Architecture

Initial deployment:

``` mermaid
flowchart TB
    User[User Browser]

    subgraph FRONT["Frontend"]
        React[React / Vite Build]
    end

    subgraph BACK["Backend"]
        Django[Django + DRF]
        SQLite[(SQLite / PostgreSQL)]
        Media[Media Storage]
    end

    subgraph AI["AI Service"]
        FastAPI[FastAPI]
        YOLO[YOLO Model]
        Chroma[(ChromaDB)]
        LLM[Ollama Local LLM]
    end

    User --> React
    React -->|HTTPS| Django

    Django --> SQLite
    Django --> Media
    Django -->|Internal HTTP| FastAPI

    FastAPI --> YOLO
    FastAPI --> Chroma
    FastAPI --> LLM
```

For the local development and testing environment:
- Django and FastAPI run in Python virtual environments.
- Django uses SQLite database (`backend/db.sqlite3`).
- FastAPI queries ChromaDB and runs a local YOLOv8 model for image segmentation.
- AI Recommendations are serviced by a local Ollama server running `qwen2.5:3b`.
- React runs via Vite dev server.

------------------------------------------------------------------------

# 67. Synchronous vs Background Processing

## Initial decision

Use synchronous processing.

``` text
POST /meals/
   ↓
Django
   ↓
FastAPI
   ↓
result
   ↓
Django
   ↓
response
```

## Why?

-   Simpler infrastructure requirements (no Celery, Redis, or RabbitMQ necessary).
-   Direct user feedback during meal upload and text parsing.
-   FastAPI handles the heavy processing (YOLO segmentation and vector searches) efficiently on localhost.

## Future trigger for asynchronous processing

Only introduce:

``` text
Redis + Celery/RQ
```

if actual measurements show that:

``` text
AI processing regularly takes too long
```

or:

``` text
concurrent users cause request timeouts
```

Then the state model already supports:

``` text
PROCESSING
COMPLETED
FAILED
```

so the migration is straightforward.

------------------------------------------------------------------------

# 68. Complete Application Workflow

``` mermaid
flowchart TD
    A[Register] --> B[Login]
    B --> C[Profile Setup]
    C --> D[Dashboard]

    D --> E[Log Meal]

    E --> F{Input Type}

    F -->|Text| G[FastAPI Text Analysis]
    F -->|Image| H[FastAPI Image Analysis]

    G --> I[ChromaDB Food Matching]
    H --> J[YOLO Detection & Portion Weight]

    J --> I
    I --> K[FastAPI Nutrition Calculation]

    K --> L[Structured AI Result]
    L --> M[Django Persistence & Validation]

    M --> N[Nutrition Report]
    N --> O{Recommendation Requested?}

    O -->|No| P[Return Meal Details]
    O -->|Yes| Q[FastAPI Ollama LLM]
    Q --> R[Structured Recommendation]
    R --> S[Save Recommendation]

    P --> T[Dashboard History]
    S --> T
    T --> D
```

------------------------------------------------------------------------

# 69. Text Meal Workflow

The system supports natural language text descriptions for logging meals:

``` text
"bhat and dal"
   ↓
Django MealLog creation
   ↓
FastAPI POST /api/food/analyze-text
   ↓
FastAPI regex parses quantity & fuzzy matches food aliases
   ↓
FastAPI queries ChromaDB metadata for nutrition values
   ↓
FastAPI calculates calories & macros
   ↓
Django receives and bulk creates MealFoodItems and TotalFoodAnalysis
```

------------------------------------------------------------------------

# 70. Recommendation Generation

Meal recommendation is explicitly triggered on-demand to optimize resource utilization:

``` text
Meal Analysis completed
     ↓
Nutrition populated
     ↓
User requests advice
     ↓
POST /api/meals/<id>/recommendation/
     ↓
Ollama LLM (qwen2.5:3b)
```

This prevents automatic invocation for every meal log, reducing token processing overhead and saving computation costs.

------------------------------------------------------------------------

# 71. Progress Tracking (Planned Feature)

Progress tracking remains a planned future capability:
- Weight logs and user objectives will be tracked via dedicated models and serializers.
- Weekly and daily calorie trends will be calculated using Django database aggregations rather than redundant database storage records.

------------------------------------------------------------------------

# 72. API Request Lifecycle Example

For:

``` text
POST /api/meals/
```

the complete lifecycle is:

``` text
React
 ↓
Axios call
 ↓
JWT Authorization Header check in Django
 ↓
accounts/CustomUser validation
 ↓
MealLog creation
 ↓
backend/core/ai_service/client.py calls FastAPI
 ↓
FastAPI parses input (Image YOLOv8 / Text regex & ChromaDB lookup)
 ↓
FastAPI computes macros & returns JSON
 ↓
Django parses response schema & validates
 ↓
Django saves TotalFoodAnalysis & MealFoodItems
 ↓
Django updates status and returns 201 Created response
 ↓
React displays detail page
```

# 73. Implementation Roadmap Status

The project implementation is complete. The roadmap below summarizes the completion status of each phase:

- **Phase 1: Core Foundations (Completed)**
  - Implemented the CustomUser model with email-only authentication and registration views in the `accounts` app.
  - Implemented profiles with nested tables for medical conditions, allergies, and dietary restrictions in the `profiles` app.
  - Configured JWT authentication across all endpoints.

- **Phase 2: Master Nutrition Database (Completed)**
  - Implemented `FoodItem` and `FoodAlias` in the `nutritiion` app.
  - Set up unique indexes, search filters, and query optimizations (such as `prefetch_related` to avoid N+1 queries).

- **Phase 3: AI Analysis Integration (Completed)**
  - Built internal FastAPI analytical routes (`POST /api/food/analyze` and `POST /api/food/analyze-text`).
  - Integrated local YOLOv8 segmentation for plate bounding, contour mask detection, and shape-based serving weight calculations.
  - Set up ChromaDB vector search to match detected labels to canonical food items.
  - Configured Ollama orchestration (`qwen2.5:3b`) for structured diet advice.
  - Implemented synchronous Django wrappers in `meals/meal_analysis_service.py` and `meals/meal_recommendation_service.py` to persist results.

- **Phase 4: Testing & Hardening (Completed)**
  - Built comprehensive Django DRF API test suites covering all accounts, profiles, nutrition, meals, and recommendations logic.
  - Verified user isolation rules and error handling boundaries.

- **Phase 5: React Frontend Integration (Completed)**
  - Implemented responsive pages for registration, profile setups, meal logging (image/text), nutrition summary views, and recommendation prompts.

------------------------------------------------------------------------



# 74. Testing Architecture

The backend test suite is structured across unit test files in each application directory:

## Accounts (`apps/accounts/tests.py`)
- **UserManagerTest:**
  - `test_create_user()`: Verifies that standard users are created successfully with hashed passwords, active status, and empty usernames. Checks handling of missing fields or empty email payloads.
  - `test_create_superuser()`: Verifies superuser flag settings (`is_staff`, `is_superuser`) and validates constraints.

## Profiles (`apps/profiles/tests.py`)
- **ReferenceModelListAPITests:**
  - `test_medical_conditions_list_authenticated()`: Verifies retrieval of active medical conditions sorted alphabetically.
  - `test_allergies_list_authenticated()`: Verifies allergy lookups.
  - `test_dietary_restrictions_list_authenticated()`: Verifies dietary restrictions.
  - `test_endpoints_unauthenticated()`: Ensures JWT protection is enforced on list endpoints.
  - `test_endpoints_disallow_mutating_methods()`: Verifies that mutating methods (POST, PUT, PATCH, DELETE) are rejected with a 405 status code.
  - `test_user_profile_m2m_patch_and_get()`: Verifies profile patch updates, including linking allergies, conditions, and restrictions, and ensures read-only fields (user) are not modified.

## Meals (`apps/meals/tests.py`)
- **MealLogAPITestCase:**
  - `test_create_meal_log_with_image_and_analysis()`: Mocks the internal FastAPI image analysis call and verifies that a multiform image POST triggers successful parsing, saves entries in `TotalFoodAnalysis` and `MealFoodItems`, and returns correct serialized totals.
  - `test_create_meal_log_with_text_description_analysis()`: Mocks FastAPI text parsing and verifies that a description payload creates nutritional totals.
  - `test_post_analyze_endpoint_triggers_analysis()`: Verifies that posting to `/analyze/` manually triggers re-analysis.
  - `test_post_analyze_without_content_returns_400()`: Ensures blank meal description requests are rejected.
  - `test_get_meals_list_and_detail()`: Tests listing and retrieving meal logs, validating that total calories and nested lists are serialized.
  - `test_patch_and_delete_meal()`: Tests partial updates and deletion.
- **MealRecommendationAPITestCase:**
  - `test_generate_recommendation_success()`: Mocks FastAPI LLM orchestration, sends the `RecommendationRequest` payload (with meal items and user profile details), and verifies database persistence in the `MealRecommendation` model.
  - `test_regenerate_updates_existing_recommendation()`: Verifies that request regenerations update the existing OneToOne recommendation record rather than inserting duplicates.
  - `test_get_recommendation_success()` / `test_get_recommendation_not_found()`: Verifies read endpoints.
  - `test_unauthorized_user_cannot_access_other_user_meal_recommendation()`: Enforces strict user isolation.
  - `test_cannot_generate_recommendation_without_analysis()`: Rejects recommendation requests for unanalyzed meals.
  - `test_ai_service_failure_returns_502()`: Verifies that connection timeouts or FastAPI server failures degrade gracefully to return a 502 Bad Gateway response.

## Nutrition (`apps/nutritiion/tests.py`)
- **FoodSerializerTests:**
  - Tests serialization and validation of nested `FoodAlias` configurations within parent `FoodItem` records, including min/max range validation (e.g. calories per 100g between 0 and 1000).
- **FoodAPITests:**
  - `test_list_endpoint_active_only()`: Ensures inactive foods are excluded from search listings.
  - `test_search_by_food_name()` / `test_search_by_active_alias()`: Tests fuzzy and text matching.
  - `test_search_by_inactive_alias_returns_nothing()`: Checks alias filters.
  - `test_query_optimization_n_plus_one()`: Asserts that querying multiple food records does not trigger N+1 queries.

------------------------------------------------------------------------

# 75. Definition of Done

The system is considered done under the following checklist:

1. **Authentication:** JWT tokens are issued, validated, and refreshed properly. Passwords are never returned in JSON responses.
2. **Profile Setup:** User health metrics and multi-select medical conditions, allergies, and dietary restrictions are saved and isolated by user.
3. **Meal Logging:** Meal entries can be logged via image upload or text input.
4. **Meal Analysis:** Synchronous connections to FastAPI parse input and record itemized breakdown statistics directly to the database.
5. **Recommendations:** Personalized advice is generated via Ollama LLM, saved in the database, and rendered on the frontend.
6. **User Isolation:** All views enforce ownership checks. A user cannot query, update, delete, or request recommendations for another user's logs or profile.

------------------------------------------------------------------------

# 76. Architecture Decisions

  -----------------------------------------------------------------------
  Decision                Chosen approach         Reason
  ----------------------- ----------------------- -----------------------
  Main backend            Django + DRF            Provides robust ORM,
                                                  built-in auth management,
                                                  and security boundaries.

  Frontend                React + Vite            Ensures responsive page
                                                  updates and interactive
                                                  user states.

  Database                SQLite (Local Dev) /    SQLite offers easy setup
                          PostgreSQL (Production) for local tests, while
                                                  PostgreSQL supports scale.

  Authentication          JWT (Simple JWT)        Decoupled token handling
                                                  without database sessions.

  AI service              FastAPI                 Separates machine learning
                                                  dependencies from Django.

  Food detection          YOLOv8 Segmentation     Lightweight, real-time
                                                  contour identification.

  Semantic matching       ChromaDB                Facilitates fast, local
                                                  vector-based name matching.

  Nutrition Calculation   FastAPI (via ChromaDB)  Maintains calculation
                                                  logic in the AI service,
                                                  simplifying Django models.

  LLM Recommendation      Ollama (qwen2.5:3b)     Keeps user health metrics
                                                  private by running LLM
                                                  computations locally.
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 77. What Has Been Deliberately Removed

The implementation deliberately excludes the following components to prevent over-engineering:
- **Message Brokers (Celery/Redis/RabbitMQ):** Synchronous request handling is fast enough for the target user load, simplifying testing and local setup.
- **Microservices-per-Domain:** Domain boundaries are managed inside monolithic Django apps and a singular FastAPI microservice, reducing networking overhead.
- **Repository/Factory Patterns:** Standard Django ORM view-serializer-service pipelines are used directly.

------------------------------------------------------------------------

# 78. Final System Data Flow

``` mermaid
flowchart LR
    User[User]
    React[React Frontend]
    Django[Django REST API]
    PG[(SQLite / PostgreSQL)]
    Media[(Media Storage)]
    FastAPI[FastAPI AI Service]
    YOLO[YOLO Segmentation]
    Portion[Portion Estimation]
    Chroma[(ChromaDB)]
    LLM[Ollama LLM]

    User --> React
    React -->|HTTPS + JWT| Django
    Django --> PG
    Django --> Media
    Django -->|Internal HTTP| FastAPI
    FastAPI --> YOLO
    FastAPI --> Portion
    Portion --> Chroma
    FastAPI --> Chroma
    FastAPI --> LLM
    FastAPI -->|Structured AI result| Django
    Django -->|Validated result| React
```

------------------------------------------------------------------------

# 79. Final End-to-End Architecture

``` text
                                      ┌─────────────────────┐
                                      │        USER         │
                                      └──────────┬──────────┘
                                                 │
                                                 ▼
                                      ┌─────────────────────┐
                                      │   REACT FRONTEND    │
                                      │                     │
                                      │ Authentication      │
                                      │ Profile Setup       │
                                      │ Meal Input          │
                                      │ Meal Detail         │
                                      └──────────┬──────────┘
                                                 │
                                      HTTPS + JWT│
                                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         DJANGO REST API                              │
│                                                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                      │
│  │  Accounts  │  │  Profiles  │  │   Meals    │                      │
│  └────────────┘  └────────────┘  └─────┬──────┘                      │
│                                        │                             │
│  ┌────────────┐                        │                             │
│  │ Nutritiion │                        │                             │
│  └─────┬──────┘                        │                             │
│        │                               │                             │
│        └──────────────┬────────────────┘                             │
│                       │                                              │
│                Business Logic                                        │
│                       │                                              │
│                AI Client                                             │
└───────────────┬───────┴───────────────────────┬──────────────────────┘
                │                               │
                ▼                               ▼
       ┌─────────────────┐             ┌──────────────────────┐
       │   PostgreSQL    │             │   Media Storage      │
       │     / SQLite    │             │                      │
       │                 │             │ meal_photos/         │
       └─────────────────┘             └──────────────────────┘
       │ Users / Profiles│
       │ Meals / Analysis│
       │ Food Master     │
       │ Recommendations │
       └─────────────────┘
                │
                │ Django → internal HTTP
                ▼
       ┌─────────────────────────────────────────────┐
       │             FASTAPI AI SERVICE              │
       │                                             │
       │  ┌──────────────┐                           │
       │  │ YOLOv8 Model │                           │
       │  └──────┬───────┘                           │
       │         │                                   │
       │         ▼                                   │
       │  ┌──────────────┐                           │
       │  │   Portion    │                           │
       │  │  Estimation  │                           │
       │  └──────┬───────┘                           │
       │         │                                   │
       │         ▼                                   │
       │  ┌──────────────┐      ┌───────────────┐    │
       │  │   Semantic   │─────▶│   ChromaDB    │    │
       │  │   Matching   │      │  Embeddings   │    │
       │  └──────────────┘      └───────────────┘    │
       │                                             │
       │  ┌─────────────────────────────────────┐    │
       │  │ Ollama LLM Service                  │    │
       │  │ Structured prompt → qwen2.5:3b      │    │
       │  └─────────────────────────────────────┘    │
       └─────────────────────────────────────────────┘
```

## Final ownership rules

1. **React:** Owns presentation, auth storage, and UI states.
2. **Django:** Owns validation, object boundaries, relational database transactions, and user isolation.
3. **SQLite / PostgreSQL:** Owns persistent relational storage.
4. **FastAPI:** Owns ML inference (YOLO segmentation, portion estimations, and semantic lookup calculations).
5. **Ollama LLM:** Generates conversational dietary reviews using deterministic macro context.

This complete end-to-end architecture forms the validated system blueprint for the Nepali Diet Advisory System.
