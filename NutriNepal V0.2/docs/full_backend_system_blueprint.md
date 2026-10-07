# Full System Design & Implementation Blueprint

## Nepali Lifestyle-Based Diet and Fitness Advisory System

**Document purpose:** Final technical blueprint for implementation of
the current project.

**Architectural baseline:** React + Django REST Framework + PostgreSQL +
internal FastAPI AI service + YOLO + ChromaDB + constrained LLM.

This design consolidates the current Django implementation, the SRS,
DFDs, UML models, proposal, and the newer backend-planning material.
Where the older architecture introduced unnecessary infrastructure or
blurred service ownership, this specification deliberately simplifies
it.

The project requirements establish the core pipeline as **profile → meal
input → food identification → nutrition calculation → constraint
screening → recommendation → history/progress**. The proposal
specifically calls for YOLO segmentation, semantic food matching,
deterministic nutritional computation, and structured LLM output.

------------------------------------------------------------------------

# 1. Current Architecture Assessment

## 1.1 Current implementation

The Django backend already contains:

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
└── meals
    ├── MealLog
    ├── MealFoodItems
    └── TotalFoodAnalysis
```

The current planning material confirms these three apps and their
responsibilities. `accounts` owns authentication, `profiles` owns
health/profile information, and `meals` owns meal logs and nutritional
analysis.

The global JWT endpoints already exist:

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
-   PostgreSQL remains the application database.
-   `accounts` remains responsible for identity/authentication.
-   `profiles` remains responsible for user health/profile data.
-   `meals` remains responsible for meal records.
-   JWT remains the authentication mechanism.
-   React communicates with Django, not directly with FastAPI.
-   FastAPI remains a separate AI/ML service.

This is consistent with the existing UML architecture where the web
application mediates communication between the user and
analytical/storage components.

## 1.3 Problems that need correction

There are several architectural issues in the earlier documents.

### Problem 1 --- FastAPI should not own nutrition records

Some earlier designs place a "nutrition database" behind FastAPI.

That creates two sources of truth:

``` text
Django PostgreSQL
        +
FastAPI nutrition database
```

That should not happen.

### Final decision

**PostgreSQL owns the authoritative nutrition master data.**

FastAPI/ChromaDB only performs semantic retrieval and returns the
corresponding `food_id`.

``` text
FastAPI
   │
   │ "bhat" → FoodItem ID 17
   ▼
Django
   │
   │ fetch FoodItem #17
   ▼
PostgreSQL
```

The proposal already describes a master nutrition database and ChromaDB
semantic matching; this design simply establishes PostgreSQL as its
authoritative source.

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

Those are deterministic application calculations.

The LLM receives already calculated facts and generates narrative
guidance.

This directly follows the proposal's requirement that standard code
performs nutritional calculations and health screening before the
structured LLM stage.

------------------------------------------------------------------------

### Problem 3 --- Redis/Celery is not required initially

The previous `workflow.md` proposes Redis + Celery/RQ for asynchronous
meal processing.

For this project, that is unnecessary for the first implementation.

The expected AI response target is roughly 3--5 seconds, and the SRS
itself specifies a three-second image-processing target.

Therefore:

**Initial architecture: synchronous Django → FastAPI request.**

If real inference later exceeds acceptable latency, background
processing can be introduced without changing the ownership model.

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

For this project, repositories do not provide enough value to justify
another abstraction.

Use:

``` text
View
 ↓
Serializer
 ↓
Service function where business logic is non-trivial
 ↓
ORM
```

Not every operation needs a service.

------------------------------------------------------------------------

### Problem 5 --- Notifications are not part of the first implementation

The workflow document promotes periodic notifications to a functional
requirement.

However, the core SRS emphasizes:

-   profile
-   meal logging
-   food detection
-   nutrition
-   recommendations
-   progress

and does not require a notification infrastructure.

Therefore:

**Notifications are postponed.**

No notification model, scheduler, Redis worker, email service, or push
infrastructure is required for the core project.

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
            MEA[Meals]
            NUT[Nutrition]
            REC[Recommendations]
            PRG[Progress]
        end

        PG[(PostgreSQL)]
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
    D --> REC
    D --> PRG

    ACC --> PG
    PRO --> PG
    MEA --> PG
    NUT --> PG
    REC --> PG
    PRG --> PG

    MEA --> MEDIA

    D -->|Internal authenticated HTTP| F

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
  PostgreSQL      Persistent storage                  All authoritative application data
  Media storage   Uploaded meal images                Image files
  FastAPI         AI processing                       AI execution state only
  YOLO            Food segmentation                   Model inference
  ChromaDB        Semantic retrieval                  Derived embeddings
  LLM             Recommendation narrative            Generated text
  User            Supplies profile/meal information   User input

## 2.3 Communication boundaries

``` text
React
  │
  │ Public HTTPS
  ▼
Django
  │
  │ Internal HTTP + service credential
  ▼
FastAPI
```

React never calls:

``` text
FastAPI
ChromaDB
LLM
YOLO
PostgreSQL
```

directly.

This preserves one public authentication boundary.

------------------------------------------------------------------------

# 3. System Boundary

## 3.1 Inside

``` text
React frontend
Django REST API
PostgreSQL
Meal image storage
FastAPI AI service
YOLO model
Embedding model
ChromaDB
Recommendation orchestration
```

## 3.2 External

Only the following may be external:

### LLM provider

Could be:

``` text
Hosted LLM API
```

or eventually:

``` text
Local LLM
```

FastAPI communicates with it.

The rest of the application does not.

### External nutrition sources

The project uses compiled nutrition sources such as:

-   Nepal Food Composition material
-   Nepali Meals Dataset
-   Nepal Nutrition and Food Security Portal

These are **data-ingestion sources**, not runtime APIs.

------------------------------------------------------------------------

# 4. Django Applications

The final Django application set should be:

``` text
apps/
├── accounts/
├── profiles/
├── meals/
├── nutrition/
├── recommendations/
└── progress/
```

No `common`, `repositories`, `notifications`, or `dashboard` app is
required.

A dashboard is a frontend feature built from existing API data.

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
-   nutrition
-   recommendations
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

Recommended fields:

  Field                 Type                      Required
  --------------------- ----------------------- ----------
  id                    UUID                           Yes
  user                  OneToOne → CustomUser          Yes
  age                   PositiveInteger                Yes
  height_cm             Decimal                        Yes
  weight_kg             Decimal                        Yes
  target_weight_kg      Decimal                         No
  activity_level        Choice                         Yes
  fitness_goal          Choice                         Yes
  dietary_preferences   Text                            No
  created_at            DateTime                      Auto
  updated_at            DateTime                      Auto

Recommended choices:

``` text
activity_level:
    SEDENTARY
    LIGHT
    MODERATE
    ACTIVE
    VERY_ACTIVE

fitness_goal:
    WEIGHT_LOSS
    WEIGHT_GAIN
    MAINTAIN
    GENERAL_FITNESS
```

## Relationships

``` text
CustomUser
     │
     │ 1:1
     ▼
UserProfile
```

Medical conditions, allergies, and restrictions should be connected to
the profile through many-to-many relationships.

``` text
UserProfile
 ├── M:N MedicalCondition
 ├── M:N Allergy
 └── M:N DietaryRestriction
```

This is better than storing:

``` text
"diabetes, hypertension, ..."
```

inside a text field.

------------------------------------------------------------------------

# 6. Meals App

This remains the central domain model.

## 6.1 MealLog

Recommended structure:

  Field             Type
  ----------------- ---------------------
  id                UUID
  user              FK CustomUser
  meal_type         Choice
  description       Text nullable
  image             ImageField nullable
  analysis_status   Choice
  analysis_error    Text nullable
  analyzed_at       DateTime nullable
  created_at        DateTime
  updated_at        DateTime

### Status

``` text
NOT_ANALYZED
PROCESSING
COMPLETED
FAILED
```

This status is useful even with synchronous processing because the
record needs to represent whether AI analysis succeeded.

## 6.2 MealFoodItem

Each individual food identified within a meal.

Recommended fields:

  Field            Type
  ---------------- -----------------------
  id               UUID
  meal             FK MealLog
  food_item        FK Nutrition.FoodItem
  detected_name    CharField
  quantity_grams   Decimal
  confidence       Decimal nullable
  calories         Decimal
  protein          Decimal
  carbohydrates    Decimal
  fats             Decimal
  source           Choice
  created_at       DateTime

`source`:

``` text
MANUAL
IMAGE
```

### Why store nutrition values here if FoodItem already has them?

Because the meal record represents a **historical calculation**.

Suppose:

``` text
FoodItem #10
calories_per_100g = 130
```

later becomes:

``` text
calories_per_100g = 140
```

Old meals must not silently change from 260 kcal to 280 kcal.

Therefore:

``` text
FoodItem
   = current authoritative nutrition reference

MealFoodItem.calories
   = historical value used when meal was analyzed
```

That is a valid historical snapshot, not a second source of truth.

------------------------------------------------------------------------

## 6.3 TotalFoodAnalysis

One-to-one with MealLog.

``` text
MealLog 1 ─── 1 TotalFoodAnalysis
```

Fields:

``` text
id
meal
total_calories
total_protein
total_carbohydrates
total_fats
created_at
updated_at
```

These totals should be calculated by Django from the `MealFoodItem`
records.

Conceptually:

``` text
MealFoodItem 1
MealFoodItem 2
MealFoodItem 3
      │
      ▼
Django Nutrition Calculator
      │
      ▼
TotalFoodAnalysis
```

------------------------------------------------------------------------

# 7. Nutrition App

This app is necessary because the system needs an authoritative master
food/nutrition database.

The proposal explicitly describes a compiled master nutrition database.

## 7.1 FoodItem

This is the authoritative nutrition entity.

Recommended fields:

  Field                    Type
  ------------------------ --------------------
  id                       UUID
  name                     CharField
  local_name               CharField nullable
  description              Text nullable
  serving_unit             CharField nullable
  calories_per_100g        Decimal
  protein_per_100g         Decimal
  carbohydrates_per_100g   Decimal
  fat_per_100g             Decimal
  fiber_per_100g           Decimal nullable
  source                   CharField
  is_active                Boolean
  created_at               DateTime
  updated_at               DateTime

Micronutrients can be added if the final nutrition dataset actually
contains reliable values.

Do not create 30 nutrient columns merely because they are possible.

## 7.2 FoodAlias

This is useful for semantic matching.

``` text
FoodItem
    │
    ├── bhat
    ├── rice
    └── white rice
```

Fields:

``` text
id
food_item
alias
language
```

Example:

``` text
FoodItem:
    White Rice

FoodAlias:
    bhat
    rice
    chawal
```

## 7.3 ChromaDB relationship

PostgreSQL remains authoritative.

ChromaDB stores:

``` text
embedding
food_id
searchable text
metadata
```

not nutrition ownership.

``` text
PostgreSQL
   │
   │ authoritative FoodItem
   ▼
Embedding generation
   │
   ▼
ChromaDB
```

If ChromaDB disappears, the master nutrition data is still intact.

------------------------------------------------------------------------

# 8. Recommendations App

This app stores recommendation history.

## Recommendation

Fields:

  Field                   Type
  ----------------------- ---------------------
  id                      UUID
  user                    FK CustomUser
  meal                    FK MealLog nullable
  deterministic_summary   JSON
  recommendation_text     JSON
  model_name              CharField nullable
  created_at              DateTime

`deterministic_summary` stores facts such as:

``` json
{
  "calories": 650,
  "protein": 24,
  "carbohydrates": 91,
  "fat": 18,
  "goal": "WEIGHT_GAIN",
  "constraint_flags": []
}
```

`recommendation_text` stores the validated structured LLM response.

The recommendation record belongs to Django.

FastAPI does not persist recommendation history.

------------------------------------------------------------------------

# 9. Progress App

A separate progress model is justified because progress is longitudinal
data rather than a property of a single meal.

## ProgressEntry

Recommended fields:

  Field        Type
  ------------ ---------------
  id           UUID
  user         FK CustomUser
  weight_kg    Decimal
  date         Date
  notes        Text nullable
  created_at   DateTime

BMI can be:

-   calculated dynamically, or
-   stored if historical reproducibility is required.

For this project, calculate it from the recorded weight and the profile
height.

``` text
BMI = weight / height²
```

Do not create a separate BMI table.

Nutrition history can be derived from:

``` text
MealLog
    ↓
TotalFoodAnalysis
```

So a separate `DailyNutritionSummary` model is unnecessary initially.

------------------------------------------------------------------------

# 10. Final Entity Relationship Structure

``` mermaid
erDiagram

    CUSTOM_USER ||--|| USER_PROFILE : owns
    CUSTOM_USER ||--o{ MEAL_LOG : creates
    CUSTOM_USER ||--o{ RECOMMENDATION : receives
    CUSTOM_USER ||--o{ PROGRESS_ENTRY : records

    USER_PROFILE }o--o{ MEDICAL_CONDITION : has
    USER_PROFILE }o--o{ ALLERGY : has
    USER_PROFILE }o--o{ DIETARY_RESTRICTION : has

    MEAL_LOG ||--o{ MEAL_FOOD_ITEM : contains
    MEAL_LOG ||--|| TOTAL_FOOD_ANALYSIS : has

    FOOD_ITEM ||--o{ FOOD_ALIAS : has
    FOOD_ITEM ||--o{ MEAL_FOOD_ITEM : referenced_by

    MEAL_LOG ||--o{ RECOMMENDATION : can_generate
```

The existing UML establishes the important user → profile and user →
meal relationships, while the project requirements establish food
analysis, recommendation, and progress as core domains.

------------------------------------------------------------------------

# 11. Data Ownership

The ownership hierarchy is:

``` text
CustomUser
│
├── UserProfile
│     ├── MedicalConditions
│     ├── Allergies
│     └── DietaryRestrictions
│
├── MealLog
│     ├── MealFoodItems
│     └── TotalFoodAnalysis
│
├── Recommendation
│
└── ProgressEntry
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
MealFoodItem
TotalFoodAnalysis
Recommendation
ProgressEntry
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
View / ViewSet
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
PostgreSQL
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
MealAnalysisService
 ↓
FastAPI
 ↓
NutritionCalculator
 ↓
ORM
```

Use services only for actual workflows.

------------------------------------------------------------------------

# 14. Recommended Django Service Layer

Only these services are justified initially:

``` text
meals/services.py

    analyze_meal()
    calculate_meal_nutrition()
    process_ai_result()

profiles/services.py

    validate_profile_constraints()

recommendations/services.py

    generate_recommendation()

progress/services.py

    calculate_progress_summary()
```

Do not create:

``` text
repositories/
factories/
interactors/
use_cases/
domain_services/
```

unless future complexity actually requires them.

------------------------------------------------------------------------

# 15. Serializers

## Accounts

``` text
UserSerializer
UserRegisterSerializer
LoginSerializer
```

### Important behavior

Password:

``` text
write_only=True
```

and must always use Django password hashing.

Never return:

``` json
{
    "password": "..."
}
```

------------------------------------------------------------------------

## Profiles

``` text
UserProfileSerializer
MedicalConditionSerializer
AllergySerializer
DietaryRestrictionSerializer
```

`user` should be:

``` text
read_only
```

The client must never submit:

``` json
{
    "user": "another-user-id"
}
```

to change ownership.

------------------------------------------------------------------------

## Meals

``` text
MealLogSerializer
MealFoodItemSerializer
TotalFoodAnalysisSerializer
MealDetailSerializer
```

### MealLog serializer

Client can submit:

``` text
meal_type
description
image
```

Server controls:

``` text
user
analysis_status
analysis_error
analyzed_at
timestamps
```

### MealFoodItem

AI-generated values should normally be read-only to React.

The frontend should not be able to arbitrarily submit:

``` json
{
    "calories": 50000
}
```

and modify nutritional history.

------------------------------------------------------------------------

## Nutrition

``` text
FoodItemSerializer
FoodAliasSerializer
```

These are primarily admin/internal data-management serializers.

A normal user does not need unrestricted CRUD access to the nutrition
master database.

------------------------------------------------------------------------

## Recommendation

``` text
RecommendationSerializer
RecommendationCreateSerializer
```

User supplies:

``` json
{
    "meal_id": "..."
}
```

Django derives:

-   user
-   meal
-   nutrition
-   profile
-   constraints

------------------------------------------------------------------------

## Progress

``` text
ProgressEntrySerializer
ProgressSummarySerializer
```

User supplies:

``` json
{
    "weight_kg": 52.4,
    "date": "2026-08-09",
    "notes": "..."
}
```

Server derives:

``` text
user
```

------------------------------------------------------------------------

# 16. API Architecture

The existing API uses `/api/`, so **do not introduce `/api/v1/` now**
purely for theoretical versioning.

Final structure:

``` text
/api/token/
/api/token/refresh/

/api/accounts/
/api/profiles/
/api/meals/
/api/nutrition/
/api/recommendations/
/api/progress/
```

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

  Method   Endpoint                        Purpose
  -------- ------------------------------- ----------------------------
  GET      `/api/profiles/user-profile/`   Get current user's profile
  POST     `/api/profiles/user-profile/`   Create profile
  PATCH    `/api/profiles/user-profile/`   Update profile

All require JWT.

No user ID should be included in the URL.

This makes the ownership boundary explicit:

``` text
/api/profiles/user-profile/
```

means:

> "my profile"

rather than:

``` text
/api/profiles/users/123/
```

------------------------------------------------------------------------

# 19. Meal Endpoints

  Method   Endpoint             Purpose
  -------- -------------------- -------------------
  GET      `/api/meals/`        List user's meals
  POST     `/api/meals/`        Create meal
  GET      `/api/meals/<id>/`   Retrieve meal
  PATCH    `/api/meals/<id>/`   Update meal
  DELETE   `/api/meals/<id>/`   Delete meal

Optional query parameters:

``` text
/api/meals/?meal_type=BREAKFAST
/api/meals/?date=2026-08-09
/api/meals/?page=2
```

No arbitrary `user_id` filter should be exposed.

------------------------------------------------------------------------

# 20. Nutrition Endpoints

Only expose endpoints needed by React.

``` text
GET /api/nutrition/foods/
GET /api/nutrition/foods/<id>/
```

These can support manual food selection/search.

For example:

``` text
GET /api/nutrition/foods/?search=bhat
```

The user can manually select a food.

Admin CRUD can be handled through Django admin initially rather than
creating a large public REST API.

------------------------------------------------------------------------

# 21. Recommendation Endpoints

  Method   Endpoint                       Purpose
  -------- ------------------------------ -----------------------------
  POST     `/api/recommendations/`        Generate recommendation
  GET      `/api/recommendations/`        List recommendation history
  GET      `/api/recommendations/<id>/`   Retrieve recommendation

Request:

``` json
{
    "meal_id": "8f2b..."
}
```

Django verifies:

``` text
meal.user == request.user
```

before doing anything else.

------------------------------------------------------------------------

# 22. Progress Endpoints

  Method   Endpoint                   Purpose
  -------- -------------------------- -----------------
  GET      `/api/progress/`           History
  POST     `/api/progress/`           Record progress
  GET      `/api/progress/<id>/`      View entry
  PATCH    `/api/progress/<id>/`      Update entry
  DELETE   `/api/progress/<id>/`      Delete entry
  GET      `/api/progress/summary/`   Summary/trends

The summary endpoint is calculated from existing data rather than stored
redundantly.

------------------------------------------------------------------------

# 23. Dashboard Endpoint

Do **not** create a Dashboard model.

The dashboard is a frontend screen.

If multiple API calls become inefficient, create one read-only
aggregation endpoint:

``` text
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

The simplest manual flow:

``` text
User
 ↓
React
 ↓
POST /api/meals/
 ↓
JWT authentication
 ↓
Serializer validation
 ↓
MealLog creation
 ↓
PostgreSQL
 ↓
Response
```

If a manual entry requires nutritional analysis:

``` text
MealLog
 ↓
food selection / text matching
 ↓
FoodItem
 ↓
quantity
 ↓
Django calculation
 ↓
MealFoodItem
 ↓
TotalFoodAnalysis
```

------------------------------------------------------------------------

# 30. Image Meal Analysis

This is the central AI workflow.

``` mermaid
sequenceDiagram
    participant U as User
    participant R as React
    participant D as Django
    participant DB as PostgreSQL
    participant F as FastAPI
    participant Y as YOLO
    participant C as ChromaDB

    U->>R: Upload meal image
    R->>D: POST /api/meals/ multipart
    D->>D: Authenticate JWT
    D->>D: Validate image
    D->>DB: Create MealLog
    D->>F: Internal analysis request

    F->>Y: Run segmentation
    Y-->>F: labels + masks + confidence

    F->>F: Estimate portions
    F->>C: Semantic food matching
    C-->>F: food_id + similarity

    F-->>D: Structured AI result

    D->>D: Validate AI response
    D->>DB: Create MealFoodItems
    D->>D: Calculate totals
    D->>DB: Create TotalFoodAnalysis
    D-->>R: Return meal result
    R-->>U: Display nutrition
```

------------------------------------------------------------------------

# 31. Important Data Boundary in Meal Analysis

The AI service should return:

``` json
{
    "foods": [
        {
            "detected_name": "bhat",
            "food_id": "food-123",
            "confidence": 0.94,
            "similarity": 0.91,
            "quantity_grams": 180
        }
    ]
}
```

Django then performs:

``` text
food_id
   ↓
FoodItem
   ↓
nutrition per 100g
   ↓
quantity_grams
   ↓
Django calculation
```

For example:

``` text
calories =
    calories_per_100g × quantity_grams / 100
```

This is critical.

**FastAPI does not get to invent the final calorie number.**

------------------------------------------------------------------------

# 32. FastAPI Responsibilities

FastAPI contains:

``` text
app/
├── routers/
│   ├── health.py
│   ├── meal_analysis.py
│   └── recommendation.py
│
├── services/
│   ├── yolo_service.py
│   ├── portion_service.py
│   ├── embedding_service.py
│   └── llm_service.py
│
├── schemas/
│   ├── meal.py
│   └── recommendation.py
│
└── core/
    ├── config.py
    ├── model_loader.py
    └── chroma_client.py
```

This is enough.

------------------------------------------------------------------------

# 33. FastAPI Meal Analysis Contract

## Endpoint

``` text
POST /internal/meal-analysis/
```

This is **not public**.

## Request

Prefer multipart for image analysis:

``` text
multipart/form-data

image=<file>
meal_id=<uuid>
```

Optional metadata:

``` text
meal_type=DINNER
```

Django already owns the authenticated user context, so FastAPI does not
need a user JWT.

------------------------------------------------------------------------

# 34. FastAPI Response

``` json
{
    "success": true,
    "model_version": "yolo-food-v1",
    "foods": [
        {
            "detected_name": "bhat",
            "food_id": "a1b2c3",
            "confidence": 0.94,
            "similarity": 0.91,
            "quantity_grams": 180
        },
        {
            "detected_name": "dal",
            "food_id": "d4e5f6",
            "confidence": 0.89,
            "similarity": 0.95,
            "quantity_grams": 120
        }
    ]
}
```

Notice what is absent:

``` text
calories
protein
fat
carbohydrates
```

Django owns those calculations.

------------------------------------------------------------------------

# 35. AI Result Validation

Django must validate:

``` text
food_id exists
quantity_grams >= 0
confidence between 0 and 1
similarity between 0 and 1
detected_name is valid
```

If:

``` text
food_id = nonexistent
```

Django rejects the result.

It should never blindly persist an AI response.

------------------------------------------------------------------------

# 36. FastAPI Authentication

Use service-to-service authentication.

For example:

``` text
X-Service-Key: <secret>
```

or:

``` text
Authorization: Bearer <internal-service-token>
```

The secret lives in environment variables.

``` text
React
   ↓
JWT
   ↓
Django

Django
   ↓
Internal service credential
   ↓
FastAPI
```

Do not send the user's JWT to FastAPI.

------------------------------------------------------------------------

# 37. FastAPI Timeout

Initial synchronous configuration:

``` text
connect timeout: ~2–5 sec
read timeout: ~10–15 sec
```

The exact values should be tuned after measuring the actual model.

The important design is:

``` text
Django does not wait indefinitely.
```

If timeout occurs:

``` text
MealLog.status = FAILED
MealLog.analysis_error = "AI service timeout"
```

and return an appropriate error.

------------------------------------------------------------------------

# 38. AI Failure Handling

### FastAPI unavailable

``` text
POST /meals/
        ↓
MealLog created
        ↓
FastAPI unavailable
        ↓
MealLog = FAILED
        ↓
502 AI_SERVICE_UNAVAILABLE
```

### AI returns invalid data

``` text
FastAPI
   ↓
Malformed response
   ↓
Django schema validation fails
   ↓
Do NOT save partial nutrition data
   ↓
Meal = FAILED
```

### ChromaDB unavailable

The meal analysis cannot reliably match foods.

Return:

``` text
AI_ANALYSIS_FAILED
```

Do not guess.

### LLM unavailable

This is different.

Nutrition calculation can still succeed.

``` text
Meal analysis
     ↓
Nutrition completed
     ↓
Recommendation requested
     ↓
LLM unavailable
     ↓
Return deterministic nutrition summary
```

This follows the earlier design principle of graceful degradation.

------------------------------------------------------------------------

# 39. Recommendation Workflow

``` mermaid
sequenceDiagram
    participant R as React
    participant D as Django
    participant DB as PostgreSQL
    participant F as FastAPI
    participant L as LLM

    R->>D: POST /api/recommendations/ {meal_id}
    D->>D: Authenticate + ownership check
    D->>DB: Fetch meal
    D->>DB: Fetch profile + constraints
    D->>D: Calculate deterministic context
    D->>F: Send structured recommendation context
    F->>L: Send constrained prompt
    L-->>F: Structured JSON
    F->>F: Validate JSON
    F-->>D: Validated recommendation
    D->>DB: Save Recommendation
    D-->>R: Recommendation response
```

------------------------------------------------------------------------

# 40. Recommendation AI Contract

Django sends something like:

``` json
{
    "user_context": {
        "age": 21,
        "weight_kg": 50,
        "height_cm": 165,
        "activity_level": "MODERATE",
        "fitness_goal": "WEIGHT_GAIN"
    },
    "meal": {
        "calories": 720,
        "protein": 28,
        "carbohydrates": 105,
        "fat": 20
    },
    "constraints": [
        "vegetarian"
    ]
}
```

FastAPI sends this to the LLM.

The LLM should **not** be asked:

> "Calculate how many calories the user needs."

It should instead be asked to interpret deterministic values.

------------------------------------------------------------------------

# 41. LLM Response Schema

For example:

``` json
{
    "summary": "This meal provides...",
    "positive_points": [
        "..."
    ],
    "suggestions": [
        "..."
    ],
    "meal_adjustments": [
        "..."
    ],
    "fitness_tip": "...",
    "cultural_note": "..."
}
```

FastAPI validates this with Pydantic.

If validation fails:

``` text
Do not persist the malformed response.
```

------------------------------------------------------------------------

# 42. Constraint Processing

Constraint screening belongs to Django.

The pipeline is:

``` text
UserProfile
    +
Medical Conditions
    +
Allergies
    +
Dietary Restrictions
    +
MealFoodItems
       ↓
Django Constraint Service
       ↓
Constraint Flags
```

Example:

``` json
{
    "food": "milk",
    "flags": [
        "ALLERGY_CONFLICT"
    ]
}
```

The LLM receives the flag.

It does not determine whether the food is medically compatible.

The UML documentation specifically identifies deterministic constraint
filtering as a safety-oriented step before recommendation output.

------------------------------------------------------------------------

# 43. Nutrition Calculation Pipeline

``` text
FoodItem
    │
    ├── calories_per_100g
    ├── protein_per_100g
    ├── carbohydrates_per_100g
    └── fat_per_100g
          │
          ▼
MealFoodItem.quantity_grams
          │
          ▼
Django Nutrition Calculator
          │
          ▼
MealFoodItem nutrient snapshot
          │
          ▼
SUM()
          │
          ▼
TotalFoodAnalysis
```

This is deterministic.

------------------------------------------------------------------------

# 44. Portion Estimation Boundary

The proposal specifies that the YOLO masks are used for portion
estimation and household-reference calibration.

Therefore:

### FastAPI

Responsible for:

``` text
segmentation
mask analysis
portion estimation
quantity_grams
```

### Django

Responsible for:

``` text
quantity validation
nutrition calculation
persistence
```

This is a clean boundary.

------------------------------------------------------------------------

# 45. Meal Processing State

``` mermaid
stateDiagram-v2
    [*] --> NOT_ANALYZED

    NOT_ANALYZED --> PROCESSING: analysis requested
    PROCESSING --> COMPLETED: valid AI response
    PROCESSING --> FAILED: timeout/error

    FAILED --> PROCESSING: retry
    COMPLETED --> PROCESSING: re-analysis
```

The frontend should show:

``` text
NOT_ANALYZED
    → Analyze

PROCESSING
    → Processing...

COMPLETED
    → View Nutrition

FAILED
    → Try Again
```

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

The existing workflow recommends short-lived access and longer-lived
refresh tokens.

## Token storage

For a production-style web implementation:

-   refresh token: preferably secure HttpOnly cookie
-   access token: kept in application memory where practical

Avoid casually storing long-lived refresh tokens in `localStorage`.

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
ai_service/
│
├── app/
│   ├── main.py
│   │
│   ├── routers/
│   │   ├── health.py
│   │   ├── meal_analysis.py
│   │   └── recommendations.py
│   │
│   ├── services/
│   │   ├── yolo_service.py
│   │   ├── portion_service.py
│   │   ├── embedding_service.py
│   │   └── llm_service.py
│   │
│   ├── schemas/
│   │   ├── meal.py
│   │   └── recommendation.py
│   │
│   └── core/
│       ├── config.py
│       ├── security.py
│       ├── model_loader.py
│       └── chroma_client.py
│
├── models/
│   └── yolo/
│
├── requirements.txt
└── .env
```

------------------------------------------------------------------------

# 56. Configuration

## Django `.env`

``` text
SECRET_KEY=
DEBUG=
ALLOWED_HOSTS=
DATABASE_URL=

AI_SERVICE_BASE_URL=
AI_SERVICE_API_KEY=

MEDIA_ROOT=
MEDIA_URL=
```

JWT lifetime settings may also be configured through environment
variables if desired.

## FastAPI `.env`

``` text
AI_SERVICE_API_KEY=

YOLO_MODEL_PATH=
CHROMA_DB_PATH=

EMBEDDING_MODEL_NAME=

LLM_PROVIDER=
LLM_API_KEY=
LLM_MODEL=
```

Nothing secret goes into Git.

------------------------------------------------------------------------

# 57. Database Configuration

PostgreSQL:

``` text
DATABASE_URL
```

Django should be the only service directly accessing application
PostgreSQL tables.

FastAPI should not directly connect to Django's application database for
ordinary AI inference.

This prevents FastAPI from bypassing Django's business rules.

------------------------------------------------------------------------

# 58. ChromaDB Architecture

ChromaDB is a derived AI index.

``` text
PostgreSQL FoodItem
        ↓
Embedding generation
        ↓
ChromaDB
```

Metadata:

``` json
{
    "food_id": "uuid",
    "name": "White Rice"
}
```

Query:

``` text
"bhat"
```

Result:

``` text
food_id = 123
similarity = 0.94
```

Then Django uses:

``` text
food_id = 123
```

to retrieve authoritative nutrition.

This preserves the semantic-matching objective described in the
proposal.

------------------------------------------------------------------------

# 59. File Storage

Meal images should not be stored as database binary fields.

Use:

``` text
PostgreSQL
    stores image path/reference

Media storage
    stores actual image
```

Development:

``` text
backend/media/
```

Production can use object storage later.

The architecture does not need to decide on a specific cloud storage
provider yet.

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
        React[React Build]
    end

    subgraph BACK["Backend"]
        Django[Django + DRF]
        PostgreSQL[(PostgreSQL)]
        Media[Media Storage]
    end

    subgraph AI["AI Service"]
        FastAPI[FastAPI]
        YOLO[YOLO Model]
        Chroma[(ChromaDB)]
        LLM[LLM Provider]
    end

    User --> React
    React -->|HTTPS| Django

    Django --> PostgreSQL
    Django --> Media
    Django -->|Internal HTTP| FastAPI

    FastAPI --> YOLO
    FastAPI --> Chroma
    FastAPI --> LLM
```

For a university project, this is sufficient.

No Kubernetes.

No Kafka.

No Redis.

No service mesh.

No API gateway product.

Django itself is the application gateway.

The earlier Lab 3 diagrams use a gateway tier and separate
processing/data/AI tiers; this architecture preserves those logical
boundaries without turning each box into an independent microservice.

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

-   simpler
-   easier to debug
-   easier for React
-   fewer infrastructure dependencies
-   appropriate for project scale
-   expected inference is intended to be lightweight

The proposal specifically selected YOLO because the system is intended
to be computationally lighter than heavier segmentation approaches.

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

    F -->|Text| G[Food Matching]
    F -->|Image| H[YOLO Detection]

    G --> I[Food IDs]
    H --> J[Portion Estimation]
    J --> I

    I --> K[Django Nutrition Lookup]
    K --> L[Nutrition Calculation]

    L --> M[Constraint Screening]
    M --> N[Nutrition Report]

    N --> O{Recommendation Requested?}

    O -->|No| P[Save Meal]
    O -->|Yes| Q[FastAPI LLM]
    Q --> R[Structured Recommendation]
    R --> S[Save Recommendation]

    P --> T[History]
    S --> T
    T --> D
```

------------------------------------------------------------------------

# 69. Text Meal Workflow

The system should support the existing requirement for manual textual
meal logging and semantic local-name matching. The SRS explicitly
requires Romanized Nepali terms such as `gundruk`, `bhat`, and `dal`.

Flow:

``` text
"bhat"
   ↓
Django
   ↓
FastAPI semantic matcher
   ↓
ChromaDB
   ↓
food_id
   ↓
Django FoodItem
   ↓
quantity
   ↓
nutrition calculation
```

For manual input where quantity is unavailable, the system should
either:

-   ask the user for quantity/serving size, or
-   record the meal without nutritional analysis.

It should not invent a quantity.

------------------------------------------------------------------------

# 70. Recommendation Generation

Recommendation is deliberately separated from meal analysis:

``` text
Meal Analysis
     ↓
Nutrition
     ↓
Constraint Screening
     ↓
Recommendation Request
     ↓
LLM
```

This is preferable to automatically invoking an LLM for every meal
upload.

It reduces:

-   API cost
-   latency
-   unnecessary inference
-   complexity

and lets the user explicitly request advice.

------------------------------------------------------------------------

# 71. Progress Tracking

Progress data comes from two sources.

### Explicit progress

``` text
ProgressEntry
    ↓
weight history
```

### Derived progress

``` text
MealLog
   ↓
TotalFoodAnalysis
   ↓
daily/weekly nutrition trends
```

Therefore:

``` text
No DailyNutrition table initially.
```

Daily summaries can be calculated using database aggregation.

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
Axios
 ↓
JWT Authorization Header
 ↓
Django URL Router
 ↓
JWT Authentication
 ↓
IsAuthenticated
 ↓
MealLogSerializer
 ↓
Image validation
 ↓
Create MealLog
 ↓
Meal Analysis Service
 ↓
AI Client
 ↓
FastAPI
 ↓
YOLO / Chroma / Portion
 ↓
AI response
 ↓
Pydantic/schema validation in Django
 ↓
FoodItem lookup
 ↓
Nutrition calculation
 ↓
Constraint screening
 ↓
MealFoodItem creation
 ↓
TotalFoodAnalysis creation
 ↓
Meal status = COMPLETED
 ↓
Meal serializer
 ↓
React
```

------------------------------------------------------------------------

# 73. Implementation Order

This is the most important practical section.

The implementation should **not** follow the old roadmap blindly because
the authentication/profile/meal foundations are already implemented.

## Phase 1 --- Stabilize existing backend

### Apps

``` text
accounts
profiles
meals
```

### Tasks

-   verify CustomUser
-   verify registration
-   verify login
-   verify JWT
-   verify profile ownership
-   verify meal ownership
-   verify meal serializers
-   verify MealFoodItem relationships
-   verify TotalFoodAnalysis relationship
-   add consistent validation
-   add tests

### Completion

All existing APIs work independently.

------------------------------------------------------------------------

# 74. Phase 2 --- Finalize Profile Domain

### Tasks

-   finalize UserProfile fields
-   finalize activity level
-   finalize fitness goal
-   connect MedicalCondition
-   connect Allergy
-   connect DietaryRestriction
-   validate one profile per user
-   add ownership tests

### Dependency

Phase 1.

### Result

The backend has complete user context for AI recommendations.

------------------------------------------------------------------------

# 75. Phase 3 --- Build Nutrition Master Database

Create:

``` text
nutrition/
    FoodItem
    FoodAlias
```

### Tasks

-   finalize schema
-   clean nutrition dataset
-   import food records
-   normalize names
-   create aliases
-   add Django admin
-   add indexes
-   expose read-only search endpoint

### Important

Do this **before** FastAPI semantic matching.

FastAPI needs stable food IDs.

------------------------------------------------------------------------

# 76. Phase 4 --- Complete Meal Domain

Modify existing `meals` only where necessary.

Add:

``` text
analysis_status
analysis_error
analyzed_at
```

Ensure:

``` text
MealFoodItem → FoodItem
```

exists.

Implement:

``` text
calculate_meal_nutrition()
```

Test:

``` text
100g rice
+
100g dal
=
correct total
```

No AI yet.

------------------------------------------------------------------------

# 77. Phase 5 --- Build FastAPI Foundation

Create:

``` text
ai_service/
```

Implement first:

``` text
GET /internal/health/
```

Then:

``` text
POST /internal/meal-analysis/
```

Initially the endpoint can use a mocked result.

This lets Django integration be completed before the real YOLO model is
attached.

------------------------------------------------------------------------

# 78. Phase 6 --- Integrate YOLO

Connect:

``` text
FastAPI
 ↓
YOLO
```

Implement:

-   model loading
-   image preprocessing
-   inference
-   NMS/model output handling
-   confidence filtering
-   mask processing
-   label extraction

Then add portion estimation.

The proposal explicitly specifies polygon-mask segmentation and NMS as
part of the image-processing pipeline.

------------------------------------------------------------------------

# 79. Phase 7 --- Integrate ChromaDB

Build:

``` text
FoodItem
 ↓
Embedding
 ↓
ChromaDB
```

Then:

``` text
"bhat"
 ↓
embedding
 ↓
Chroma similarity
 ↓
FoodItem ID
```

Set a configurable similarity threshold.

If below threshold:

``` text
unrecognized food
```

Do not force a bad match.

------------------------------------------------------------------------

# 80. Phase 8 --- Django ↔ FastAPI Meal Integration

Connect the real pipeline:

``` text
Django
 ↓
FastAPI
 ↓
YOLO
 ↓
Portion
 ↓
Chroma
 ↓
Food IDs
 ↓
Django
 ↓
Nutrition
```

Test the entire pipeline with known images.

------------------------------------------------------------------------

# 81. Phase 9 --- Constraint Engine

Implement deterministic rules.

Inputs:

``` text
UserProfile
MedicalCondition
Allergy
DietaryRestriction
MealFoodItem
```

Output:

``` text
constraint flags
```

Example:

``` json
{
    "food_id": "123",
    "flags": [
        "ALLERGY_CONFLICT"
    ]
}
```

Do not send data to the LLM until this stage is complete.

------------------------------------------------------------------------

# 82. Phase 10 --- Recommendation System

Implement:

``` text
Recommendation model
Recommendation API
FastAPI LLM endpoint
Pydantic validation
```

Flow:

``` text
Django deterministic context
        ↓
FastAPI
        ↓
LLM
        ↓
Pydantic validation
        ↓
Django
        ↓
PostgreSQL
```

------------------------------------------------------------------------

# 83. Phase 11 --- Progress

Implement:

``` text
ProgressEntry
```

and:

``` text
GET /api/progress/
POST /api/progress/
GET /api/progress/summary/
```

Then calculate:

-   weight trend
-   BMI trend
-   nutrition trend

from existing records.

------------------------------------------------------------------------

# 84. Phase 12 --- React Integration

Recommended order:

``` text
Authentication
 ↓
Profile
 ↓
Meal logging
 ↓
Meal analysis
 ↓
Nutrition result
 ↓
Recommendation
 ↓
History
 ↓
Progress
 ↓
Dashboard
```

Do not build the dashboard first.

It depends on almost every other feature.

------------------------------------------------------------------------

# 85. Phase 13 --- Hardening

After all features work:

-   ownership audit
-   serializer audit
-   API error consistency
-   image validation
-   FastAPI timeout handling
-   AI response validation
-   CORS
-   production settings
-   environment secrets
-   logging
-   database indexes

------------------------------------------------------------------------

# 86. Phase 14 --- Testing & Integration

Run:

``` text
Django unit tests
 ↓
API tests
 ↓
ownership tests
 ↓
FastAPI tests
 ↓
Django ↔ FastAPI tests
 ↓
React integration
 ↓
full workflow
```

------------------------------------------------------------------------

# 87. Testing Architecture

## Accounts

Test:

-   registration
-   duplicate email
-   password hashing
-   login
-   invalid password
-   JWT access
-   refresh

## Profiles

Test:

-   create profile
-   update profile
-   one profile per user
-   cannot access another user's profile
-   invalid age/height/weight
-   medical-condition relationships

## Meals

Test:

-   create meal
-   retrieve own meal
-   cannot retrieve another user's meal
-   update own meal
-   delete own meal
-   invalid meal type
-   invalid image
-   oversized image

## Nutrition

Test:

-   food lookup
-   alias lookup
-   nutrition calculation
-   quantity scaling
-   total calculation

## AI integration

Test:

-   FastAPI success
-   timeout
-   connection failure
-   invalid response
-   missing food ID
-   low similarity
-   malformed quantity

## Recommendations

Test:

-   meal ownership
-   processed-meal requirement
-   constraint context
-   valid LLM response
-   invalid LLM response
-   LLM unavailable

## Progress

Test:

-   create entry
-   update entry
-   user isolation
-   summary calculations

------------------------------------------------------------------------

# 88. Most Important Integration Tests

Do not create hundreds of tests before validating the architecture.

The highest-value tests are:

### Test 1 --- User isolation

``` text
User A creates meal
User B requests meal A
→ cannot access
```

### Test 2 --- Meal analysis

``` text
Upload image
→ Django
→ FastAPI
→ result
→ PostgreSQL
```

### Test 3 --- Nutrition integrity

``` text
AI returns food_id + quantity
→ Django retrieves FoodItem
→ correct nutrition
```

### Test 4 --- AI failure

``` text
FastAPI unavailable
→ Meal marked FAILED
→ no partial nutrition data
```

### Test 5 --- Invalid AI result

``` text
FastAPI returns nonexistent food_id
→ Django rejects result
```

### Test 6 --- Recommendation isolation

``` text
User A cannot request recommendation for User B's meal
```

These protect the most important architectural boundaries.

------------------------------------------------------------------------

# 89. Definition of Done

## Authentication

Complete when:

-   registration works
-   login works
-   JWT works
-   refresh works
-   invalid credentials fail
-   password never exposed
-   tests pass

## Profile

Complete when:

-   user can create profile
-   user can update profile
-   medical conditions work
-   allergies work
-   dietary restrictions work
-   user isolation works

## Meal Logging

Complete when:

-   user can create meal
-   image can be uploaded
-   meal is stored
-   meal can be retrieved
-   meal history works
-   ownership is enforced

## Meal Analysis

Complete when:

-   image reaches FastAPI
-   YOLO identifies food
-   portion estimate is returned
-   Chroma identifies FoodItem
-   Django validates result
-   nutrition is calculated
-   MealFoodItems are persisted
-   TotalFoodAnalysis is persisted
-   failure state works

## Recommendations

Complete when:

-   processed meal can be selected
-   profile context is loaded
-   constraints are evaluated
-   deterministic summary is produced
-   FastAPI generates structured recommendation
-   response is validated
-   recommendation is persisted
-   React displays it

## Progress

Complete when:

-   user can record weight
-   history is visible
-   summary is calculated
-   another user cannot access it

------------------------------------------------------------------------

# 90. Architecture Decisions

  -----------------------------------------------------------------------
  Decision                Chosen approach         Reason
  ----------------------- ----------------------- -----------------------
  Main backend            Django + DRF            Already implemented;
                                                  owns application logic

  Frontend                React                   Existing project
                                                  decision

  Database                PostgreSQL              Authoritative
                                                  relational storage

  Authentication          JWT                     Already implemented

  AI service              FastAPI                 Isolates ML inference

  Food detection          YOLO segmentation       Project's core ML
                                                  approach

  Semantic matching       ChromaDB                Required for local-name
                                                  matching

  Nutrition source of     PostgreSQL              Prevents duplicated
  truth                                           authoritative data

  Nutrition calculation   Django                  Deterministic and
                                                  auditable

  Constraint filtering    Django                  Application/business
                                                  rule

  LLM                     FastAPI                 AI-specific
                                                  responsibility

  LLM output              Structured JSON         Predictable frontend
                                                  contract

  AI communication        Django → FastAPI        Single public API
                                                  boundary

  AI authentication       Internal service        Separates service trust
                          credential              from user JWT

  Meal processing         Synchronous initially   Simpler and appropriate
                                                  for project scale

  Background queue        Not initially           No demonstrated
                                                  requirement

  Redis                   Not initially           Avoid unnecessary
                                                  infrastructure

  Celery/RQ               Not initially           Same reason

  Repository layer        No                      ORM is sufficient

  Common Django app       No                      Avoid dumping unrelated
                                                  abstractions

  Dashboard model         No                      Dashboard derives
                                                  existing data

  Daily nutrition table   No                      Derive from meal
                                                  analyses

  Notification system     Deferred                Not required for core
                                                  implementation

  File storage            Django media            Simple now; object
                          abstraction             storage later

  API versioning          Keep `/api/`            Avoid unnecessary
                                                  migration

  Admin nutrition         Django admin            Enough for project
  management                                      

  React state             Context + local state   Simple frontend
                                                  requirement
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 91. What Has Been Deliberately Removed

The final design intentionally does **not** include:

``` text
Kafka
Redis
Celery
Kubernetes
microservice-per-domain
repository pattern
factory pattern
event bus
notification workers
separate dashboard database
separate nutrition database
FastAPI direct public access
```

This is not a lack of scalability planning.

It is deliberate scope control.

The project already has enough complexity:

``` text
React
+
Django
+
PostgreSQL
+
FastAPI
+
YOLO
+
ChromaDB
+
LLM
```

Adding infrastructure without a concrete need would make the project
harder to build, test, deploy, and explain.

------------------------------------------------------------------------

# 92. Final System Data Flow

``` mermaid
flowchart LR
    User[User]

    React[React Frontend]

    Django[Django REST API]

    Accounts[Accounts]
    Profiles[Profiles]
    Meals[Meals]
    Nutrition[Nutrition]
    Recommendations[Recommendations]
    Progress[Progress]

    PG[(PostgreSQL)]
    Media[(Media Storage)]

    FastAPI[FastAPI AI Service]
    YOLO[YOLO Segmentation]
    Portion[Portion Estimation]
    Chroma[(ChromaDB)]
    LLM[LLM]

    User --> React
    React -->|HTTPS + JWT| Django

    Django --> Accounts
    Django --> Profiles
    Django --> Meals
    Django --> Nutrition
    Django --> Recommendations
    Django --> Progress

    Accounts --> PG
    Profiles --> PG
    Meals --> PG
    Nutrition --> PG
    Recommendations --> PG
    Progress --> PG

    Meals --> Media

    Django -->|Internal service request| FastAPI

    FastAPI --> YOLO
    YOLO --> Portion
    Portion --> Chroma
    FastAPI --> Chroma
    FastAPI --> LLM

    FastAPI -->|Structured AI result| Django

    Django -->|Validated result| React
```

------------------------------------------------------------------------

# 93. Final End-to-End Architecture

The complete implementation should ultimately look like this:

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
                                      │ Profile             │
                                      │ Meal Logging        │
                                      │ Nutrition           │
                                      │ Recommendations     │
                                      │ Progress            │
                                      └──────────┬──────────┘
                                                 │
                                      HTTPS + JWT│
                                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         DJANGO REST API                              │
│                                                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                    │
│  │  Accounts  │  │  Profiles  │  │   Meals    │                    │
│  └────────────┘  └────────────┘  └─────┬──────┘                    │
│                                        │                            │
│  ┌────────────┐  ┌────────────────┐  │  ┌────────────┐            │
│  │ Nutrition  │  │ Recommendations│  │  │  Progress  │            │
│  └─────┬──────┘  └────────────────┘  │  └────────────┘            │
│        │                              │                            │
│        └──────────────┬───────────────┘                            │
│                       │                                            │
│                Business Logic                                      │
│                       │                                            │
│                AI Integration                                      │
└───────────────┬───────┴───────────────────────┬─────────────────────┘
                │                               │
                ▼                               ▼
       ┌─────────────────┐             ┌──────────────────────┐
       │   PostgreSQL    │             │   Media Storage      │
       │                 │             │                      │
       │ Users           │             │ Meal Images          │
       │ Profiles        │             └──────────────────────┘
       │ Meals           │
       │ Food Master     │
       │ Recommendations │
       │ Progress        │
       └─────────────────┘
                │
                │ Django → internal HTTP
                ▼
       ┌─────────────────────────────────────────────┐
       │             FASTAPI AI SERVICE              │
       │                                             │
       │  ┌──────────────┐                           │
       │  │ YOLO Model   │                           │
       │  └──────┬───────┘                           │
       │         │                                   │
       │         ▼                                   │
       │  ┌──────────────┐                           │
       │  │   Portion    │                           │
       │  │  Estimation  │                           │
       │  └──────┬───────┘                           │
       │         │                                   │
       │         ▼                                   │
       │  ┌──────────────┐      ┌───────────────┐   │
       │  │   Semantic   │─────▶│   ChromaDB    │   │
       │  │   Matching   │      │  Embeddings   │   │
       │  └──────────────┘      └───────────────┘   │
       │                                             │
       │  ┌─────────────────────────────────────┐   │
       │  │ LLM Recommendation Service           │   │
       │  │ Structured prompt → structured JSON  │   │
       │  └─────────────────────────────────────┘   │
       └─────────────────────────────────────────────┘
```

## Final ownership rule

The entire architecture can be reduced to five important rules:

``` text
React
    owns presentation.

Django
    owns the application.

PostgreSQL
    owns persistent truth.

FastAPI
    owns AI execution.

LLM
    generates narrative, never authoritative calculations.
```

That is the architectural boundary to use as the **implementation
baseline going forward**.

It also preserves the major architectural intent already established in
the DFD/UML work---client, gateway/application, processing, data, and AI
boundaries---while implementing them as a practical Django + FastAPI
system rather than turning every logical component into a separate
microservice.

The core requirements---profile management, manual/image meal logging,
food segmentation, semantic food matching, nutrition calculation,
personalized recommendations, and progress tracking---are all
represented in this design.

**Implementation should now begin with Phase 1: auditing and stabilizing
the existing `accounts`, `profiles`, and `meals` code, then moving to
the `nutrition` master-data layer before connecting the real
YOLO/FastAPI pipeline.**
