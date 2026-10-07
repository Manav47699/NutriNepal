# Nepali Lifestyle-Based Diet and Fitness Advisory System

**A Culturally-Aware, AI-Powered Nutrition & Fitness Advisory Platform for Nepal**

Tribhuvan University · Institute of Engineering · Purwanchal Campus, Dharan
Department of Electronics and Computer Engineering — Minor Project (2083)

Team: Himal Bhandari (PUR080BCT034) · Kshitiz Portel (PUR080BCT039) · Manav Acharya (PUR080BCT041) · Mausam Parajuli (PUR080BCT045)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Functional Requirements](#2-functional-requirements)
3. [Non-Functional Requirements](#3-non-functional-requirements)
4. [System Architecture](#4-system-architecture)
5. [High Level Architecture Diagram](#5-high-level-architecture-diagram)
6. [Technology Stack](#6-technology-stack)
7. [Folder Structure](#7-folder-structure)
8. [Backend Architecture](#8-backend-architecture)
9. [Frontend Architecture](#9-frontend-architecture)
10. [Database Design](#10-database-design)
11. [API Design](#11-api-design)
12. [Authentication Flow](#12-authentication-flow)
13. [User Workflow](#13-user-workflow)
14. [AI Pipeline](#14-ai-pipeline)
15. [Recommendation Engine](#15-recommendation-engine)
16. [Sequence Diagrams](#16-sequence-diagrams)
17. [Development Roadmap](#17-development-roadmap)
18. [Testing Strategy](#18-testing-strategy)
19. [Deployment Architecture](#19-deployment-architecture)
20. [Future Enhancements](#20-future-enhancements)
21. [Risks and Challenges](#21-risks-and-challenges)
22. [Project Timeline](#22-project-timeline)
23. [Coding Standards](#23-coding-standards)
24. [README / Getting Started](#24-readme--getting-started)

---

## 1. Project Overview

### 1.1 Project Title
**Nepali Lifestyle-Based Diet and Fitness Advisory System**

### 1.2 Introduction
The system is a web-based advisory platform that gives users personalized diet and fitness guidance grounded in Nepali food culture. A user photographs a meal from a top-down angle; the system uses a YOLO instance-segmentation model to detect and mask individual food items, matches the detected item names against a Nepali food/nutrition master database using vector cosine-similarity search (to bridge colloquial names such as "bhat" to formal entries like "White Rice"), computes nutritional totals, screens them against the user's stored health profile, and finally uses an LLM (constrained to a fixed JSON template) to generate clear, personalized coaching feedback.

### 1.3 Problem Statement
Existing diet/fitness applications are built around Western food databases and dietary norms. They do not recognize Nepali dishes, do not account for religious fasting (*vrat*) or mourning-period food restrictions, and generally require manual, tedious food logging. This makes them ineffective and low-adoption for Nepali users, despite a rising local burden of lifestyle diseases (obesity, diabetes, cardiovascular disease) driven by urbanization and processed-food culture.

### 1.4 Motivation
- Nepal lacks any large-scale digital nutrition tool tailored to local cuisine and cultural food practices.
- Existing local research (e.g., SmartCal, GDM management apps) solves narrow slices of the problem but not the full personalized advisory lifecycle.
- Automated photo-based food logging removes the friction that causes most diet-tracking apps to be abandoned within weeks.
- A lightweight YOLO-based pipeline (vs. heavier Mask R-CNN approaches used in prior work) makes real-time, low-cost inference feasible for a student-built, cloud-light deployment.

### 1.5 Objectives
- Build an automated web application that tracks daily user health metrics and delivers personalized, easy-to-understand lifestyle coaching.
- Automate food tracking by combining YOLO polygon-mask segmentation of meal photos with vector-similarity matching of local food names against a nutrition database.

### 1.6 Expected Outcomes
- A working web platform where a user can register, set up a health profile, upload a meal photo, and receive: detected foods, estimated portions, computed nutrition totals, and an LLM-generated, culturally-aware recommendation.
- ≥ 80% mean Average Precision (mAP) on the food segmentation model.
- ≥ 85% accuracy on semantic food-name matching via cosine similarity.

### 1.7 Scope
In scope: user profile management, photo-based food detection/segmentation, portion estimation, nutrition calculation, rule-based + LLM-based recommendation generation, health/progress history, and wellness-only (non-clinical) guidance that respects fasting/medical/social dietary constraints.

### 1.8 Limitations
- The system provides **wellness guidance only** — it is explicitly **not** a medical diagnostic or treatment tool.
- Food recognition accuracy is bounded by the custom Nepali-dish dataset; uncommon or heavily mixed dishes may be misclassified.
- Portion/weight estimation from a single top-down 2D image is an approximation, calibrated against household reference templates rather than true volumetric measurement.
- LLM-generated feedback is constrained to a fixed template to reduce hallucination, but is still probabilistic text generation and should be treated as advisory, not authoritative.

---

## 2. Functional Requirements

| # | Requirement | Description |
|---|---|---|
| FR-1 | User Registration | New users create an account with email/password. |
| FR-2 | User Login / Logout | JWT-based authenticated sessions. |
| FR-3 | User Profile Setup | One-time onboarding questionnaire (age, weight, height, activity level, medical conditions, social/religious dietary constraints, goals). |
| FR-4 | Profile Management | Users can view/update their profile and health metrics over time. |
| FR-5 | Meal Image Upload | Users upload a top-down photo of a meal. |
| FR-6 | Food Detection & Segmentation | YOLO instance segmentation identifies and masks individual food items on the plate. |
| FR-7 | Portion Estimation | Segmented regions are mapped to calibrated household reference templates to estimate weight/portion. |
| FR-8 | Local Food Name Matching | Detected labels are matched to the master nutrition database via ChromaDB cosine-similarity search. |
| FR-9 | Nutrition Calculation | Backend computes calories, macros, and micronutrients for the identified meal. |
| FR-10 | Health/Constraint Screening | System flags or filters foods that conflict with the user's medical conditions, fasting periods, or social constraints. |
| FR-11 | Recommendation Generation | An LLM, fed a strict structured template of computed data, generates personalized dietary/fitness feedback in fixed JSON form. |
| FR-12 | Daily/Periodic Reporting | Automated notifications summarize the user's daily nutrition report. |
| FR-13 | Progress Tracking / History | Users can view historical meal logs, nutrition trends, and recommendation history. |
| FR-14 | Dashboard | Central view summarizing today's intake, goals, and recent recommendations. |

> **Recommended Design Decision:** FR-12 (notifications) and FR-14 (dashboard) are natural extensions of the proposal's "Daily user report through notifications" block in the methodology diagram; they are treated here as first-class functional requirements to make the block diagram implementable.

---

## 3. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Meal-image inference (YOLO + similarity search) should return results in under ~3–5 seconds on a modest GPU/CPU-optimized FastAPI service. |
| **Security** | Passwords hashed (bcrypt/argon2); JWT access + refresh tokens; HTTPS everywhere; role-based permissions on all endpoints. |
| **Scalability** | Stateless Django/FastAPI services behind a load balancer; PostgreSQL and ChromaDB can scale independently; async task queue for heavy inference. |
| **Reliability** | Graceful degradation if the LLM or vector DB is unavailable (fallback to deterministic nutrition report without narrative feedback). |
| **Maintainability** | Modular Django apps, typed Pydantic schemas at FastAPI boundaries, documented API contracts, consistent code style. |
| **Availability** | Target ≥ 99% uptime for core logging/profile features; AI inference service may have a separate, looser SLA. |
| **Usability** | Simple onboarding flow; mobile-friendly responsive React UI; minimal-friction photo upload flow. |
| **Portability** | Fully containerized (Docker) so it can run on a student's laptop, a free-tier cloud host, or fully offline with a local quantized LLM. |
| **Privacy** | Health data (medical conditions) treated as sensitive; encrypted at rest where feasible; not shared with third parties; user can delete their data. |

---

## 4. System Architecture

The system is composed of five cooperating layers:

- **Frontend (React):** collects user input, displays dashboards, nutrition reports, and recommendations.
- **Backend (Django REST Framework):** owns authentication, user profiles, business rules, and persistent storage orchestration.
- **AI Service (FastAPI):** a separate, async, high-performance service dedicated to ML inference — YOLO segmentation, embedding generation, cosine-similarity lookup, and LLM orchestration (via LangChain).
- **Relational Database (PostgreSQL):** stores structured data — users, profiles, meal logs, nutrition records, recommendation history.
- **Vector Database (ChromaDB):** stores embeddings of the master nutrition database's food names for semantic matching.
- **LLM:** consumes a strict, pre-filled JSON template (never raw numbers "trusted" to be computed by the model) and returns structured, culturally-aware coaching text.

Communication flow: React → Django (auth/business logic) → FastAPI (AI inference, called internally by Django or directly by React with a service token) → PostgreSQL/ChromaDB → LLM → structured JSON response bubbled back up to the user.

> **Recommended Design Decision:** Django REST Framework acts as the system-of-record and gatekeeper; FastAPI is treated as an internal microservice only reachable via Django (not directly exposed to the public internet) to keep a single authentication boundary.

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        A[React Frontend]
    end

    subgraph Core["Core Backend"]
        B[Django REST API]
        C[(PostgreSQL)]
    end

    subgraph AI["AI Service Layer"]
        D[FastAPI AI Service]
        E[Ultralytics YOLO<br/>Segmentation]
        F[(ChromaDB<br/>Vector Store)]
        G[Recommendation Engine<br/>Rules + LLM Orchestrator]
        H[LLM]
    end

    A -->|HTTPS / JWT| B
    B <--> C
    B -->|Internal service call| D
    D --> E
    D --> F
    E --> G
    F --> G
    G --> H
    H --> G
    G --> D
    D --> B
    B --> A
```

---

## 5. High Level Architecture Diagram

```mermaid
flowchart TD
    U[User] --> R[React]
    R --> DJ[Django REST API]
    DJ --> PG[(PostgreSQL)]
    DJ --> FA[FastAPI AI Service]
    FA --> Y[YOLO Segmentation]
    Y --> ND[(Nutrition Database)]
    ND --> RE[Recommendation Engine]
    RE --> L[LLM]
    L --> RESP[Structured JSON Response]
    RESP --> DJ
    DJ --> R
    R --> U
```

---

## 6. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, React Router, Context API / Redux Toolkit, Axios, Tailwind CSS |
| Backend | Django, Django REST Framework, SimpleJWT |
| AI Service | FastAPI, Uvicorn/Gunicorn workers |
| Database | PostgreSQL |
| Vector Database | ChromaDB |
| Authentication | JWT (access + refresh tokens) |
| AI/ML Framework | PyTorch / TensorFlow, Ultralytics YOLO |
| Orchestration | LangChain, Pydantic |
| LLM | Hosted API model or local quantized model (offline mode) |
| Deployment | Docker, Docker Compose, Nginx, Gunicorn |
| Cloud Targets | Vercel (frontend), Render/Railway (backend/AI service) |
| Version Control | Git + GitHub |
| Testing | Pytest, Django TestCase, Jest + React Testing Library, Postman/Newman |
| CI/CD | GitHub Actions |

---

## 7. Folder Structure

```
nepali-diet-fitness-advisor/
├── backend/                        # Django project
│   ├── config/                     # settings, urls, wsgi/asgi
│   ├── apps/
│   │   ├── users/                  # custom user, auth
│   │   ├── profiles/                # health profile, constraints
│   │   ├── meals/                   # meal logs, uploads
│   │   ├── nutrition/                # nutrition master data (Nepali dishes)
│   │   ├── recommendations/         # recommendation history
│   │   └── common/                  # shared utils, permissions, pagination
│   ├── manage.py
│   └── requirements.txt
│
├── ai_service/                     # FastAPI AI microservice
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/                 # /detect, /match, /recommend
│   │   ├── services/                 # yolo_service.py, embedding_service.py, llm_service.py
│   │   ├── schemas/                  # Pydantic request/response models
│   │   └── core/                     # config, chroma_client, model loader
│   └── requirements.txt
│
├── ml_models/
│   ├── yolo/                        # trained weights (.pt), training configs
│   └── embeddings/                  # embedding model artifacts
│
├── datasets/
│   ├── raw/                          # source images, annotations
│   ├── processed/
│   └── nutrition_master/             # merged nutrition CSV/JSON
│
├── frontend/                       # React app
│   ├── src/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── components/
│   │   ├── features/                 # feature-based modules
│   │   ├── context/ (or store/)
│   │   ├── api/
│   │   └── routes/
│   └── package.json
│
├── docs/                            # this document, ADRs, diagrams
├── scripts/                         # data prep, migration, seed scripts
├── docker/                          # Dockerfiles per service
├── .github/workflows/                # CI/CD pipelines
├── docker-compose.yml
└── README.md
```

---

## 8. Backend Architecture

**Django Apps**

- `users` — Custom User model (email-based auth), JWT issuing/refresh, permission classes.
- `profiles` — One-time onboarding data: demographics, activity level, medical conditions, social/religious food constraints, goals.
- `meals` — Meal image upload, linkage to detection results, meal log history.
- `nutrition` — Master nutrition database (dish name, macros, micros), synced with ChromaDB embeddings.
- `recommendations` — Stores each generated recommendation, its inputs, and the deterministic vs. AI-generated split (for auditability).
- `common` — Shared serializer mixins, custom permissions, exception handling, pagination.

**Layering within each app**
- **Models** — ORM-backed persistence (PostgreSQL).
- **Serializers** — DRF serializers for validation and (de)serialization.
- **Views/ViewSets** — Thin controllers; delegate business logic to services.
- **Services** — Business logic (e.g., nutrition aggregation, constraint screening) kept out of views for testability.
- **Repositories** *(Recommended Design Decision)* — Thin data-access wrappers around querysets for the `nutrition` and `recommendations` apps, to simplify future swap of storage backend.
- **Permissions** — DRF permission classes (`IsAuthenticated`, `IsProfileOwner`, etc.).

**Authentication**
- Custom `User` model (email as username field).
- JWT via `djangorestframework-simplejwt`: short-lived access tokens, longer-lived refresh tokens, rotation + blacklist on logout.

---

## 9. Frontend Architecture

- **Pages:** Landing, Register, Login, Onboarding/Profile Setup, Dashboard, Meal Upload, Meal Report, History, Settings.
- **Layouts:** `AuthLayout` (login/register), `AppLayout` (sidebar/topbar for authenticated pages).
- **Protected Routes:** Dashboard, Meal Upload, History, Settings — require valid JWT; redirect to Login otherwise.
- **Public Routes:** Landing, Login, Register.
- **State Management:** Context API for auth/session state; Redux Toolkit (or React Query) for server-state caching of meals/recommendations if complexity grows.
- **API Layer:** Centralized Axios instance with interceptors for attaching JWT and refreshing on 401.
- **Component Structure:** Feature-based organization —

```
src/features/
├── auth/
├── profile/
├── meals/
├── nutrition/
└── recommendations/
```

Each feature folder contains its own components, hooks, API calls, and types, keeping cross-cutting concerns isolated.

---

## 10. Database Design

### 10.1 Core Tables

| Table | Key Columns |
|---|---|
| `users` | id (PK), email (unique), password_hash, created_at |
| `profiles` | id (PK), user_id (FK→users), age, weight_kg, height_cm, activity_level, goal, created_at, updated_at |
| `medical_conditions` | id (PK), profile_id (FK→profiles), condition_name, severity |
| `dietary_constraints` | id (PK), profile_id (FK→profiles), constraint_type (fasting/religious/social), description |
| `meals` | id (PK), user_id (FK→users), image_url, captured_at, status |
| `meal_items` | id (PK), meal_id (FK→meals), detected_label, matched_food_id (FK→nutrition_items), estimated_weight_g, confidence_score |
| `nutrition_items` | id (PK), name, category, calories_per_100g, protein_g, fat_g, carbs_g, fiber_g, source |
| `recommendations` | id (PK), meal_id (FK→meals), user_id (FK→users), deterministic_summary (JSON), llm_feedback (text), created_at |
| `notifications` | id (PK), user_id (FK→users), type, payload, sent_at |

### 10.2 ER Diagram

```mermaid
erDiagram
    USERS ||--|| PROFILES : has
    PROFILES ||--o{ MEDICAL_CONDITIONS : includes
    PROFILES ||--o{ DIETARY_CONSTRAINTS : includes
    USERS ||--o{ MEALS : uploads
    MEALS ||--o{ MEAL_ITEMS : contains
    MEAL_ITEMS }o--|| NUTRITION_ITEMS : matches
    MEALS ||--o{ RECOMMENDATIONS : generates
    USERS ||--o{ NOTIFICATIONS : receives

    USERS {
        uuid id PK
        string email
        string password_hash
        datetime created_at
    }
    PROFILES {
        uuid id PK
        uuid user_id FK
        int age
        float weight_kg
        float height_cm
        string activity_level
        string goal
    }
    MEALS {
        uuid id PK
        uuid user_id FK
        string image_url
        datetime captured_at
        string status
    }
    MEAL_ITEMS {
        uuid id PK
        uuid meal_id FK
        string detected_label
        uuid matched_food_id FK
        float estimated_weight_g
        float confidence_score
    }
    NUTRITION_ITEMS {
        uuid id PK
        string name
        string category
        float calories_per_100g
    }
    RECOMMENDATIONS {
        uuid id PK
        uuid meal_id FK
        uuid user_id FK
        json deterministic_summary
        text llm_feedback
    }
```

### 10.3 Indexing & Normalization
- Tables normalized to 3NF; `nutrition_items` deliberately denormalized-friendly for read-heavy lookups.
- Indexes on `users.email`, `meals.user_id`, `meal_items.meal_id`, and a composite index on `(user_id, captured_at)` for history queries.
- `nutrition_items.name` indexed for exact-match fallback alongside the ChromaDB vector index for semantic matching.

### 10.4 Future Scalability
- Partition `meals`/`meal_items` by date range once volume grows.
- Move `nutrition_items` master data behind a read-replica if it becomes a shared reference dataset across other apps.

---

## 11. API Design

Base path: `/api/v1/`

### `POST /api/v1/auth/register/`
- **Purpose:** Create a new user account.
- **Auth Required:** No
- **Request Body:** `{ "email": string, "password": string }`
- **Response:** `201 { "id": uuid, "email": string }`
- **Errors:** `400` validation error, `409` email already exists.

### `POST /api/v1/auth/login/`
- **Purpose:** Authenticate and issue tokens.
- **Auth Required:** No
- **Request Body:** `{ "email": string, "password": string }`
- **Response:** `200 { "access": string, "refresh": string }`
- **Errors:** `401` invalid credentials.

### `POST /api/v1/auth/refresh/`
- **Purpose:** Refresh access token.
- **Auth Required:** Refresh token only
- **Request Body:** `{ "refresh": string }`
- **Response:** `200 { "access": string }`
- **Errors:** `401` invalid/expired refresh token.

### `GET / PUT /api/v1/profile/`
- **Purpose:** Retrieve or update the authenticated user's health profile.
- **Auth Required:** Yes
- **Request Body (PUT):** `{ age, weight_kg, height_cm, activity_level, goal, medical_conditions[], dietary_constraints[] }`
- **Response:** `200` profile object.
- **Errors:** `400` validation, `401` unauthorized.

### `POST /api/v1/meals/`
- **Purpose:** Upload a meal image for processing.
- **Auth Required:** Yes
- **Request Body:** `multipart/form-data` with image file.
- **Response:** `202 { "meal_id": uuid, "status": "processing" }`
- **Errors:** `400` invalid image, `413` file too large.

### `GET /api/v1/meals/{meal_id}/`
- **Purpose:** Retrieve detection + nutrition results for a meal.
- **Auth Required:** Yes
- **Response:** `200` meal object with `meal_items[]` and nutrition totals.
- **Errors:** `404` not found, `403` not owner.

### `GET /api/v1/meals/`
- **Purpose:** List the user's meal history (paginated).
- **Auth Required:** Yes
- **Response:** `200` paginated list.

### `POST /api/v1/recommendations/`
- **Purpose:** Trigger recommendation generation for a processed meal.
- **Auth Required:** Yes
- **Request Body:** `{ "meal_id": uuid }`
- **Response:** `200 { "deterministic_summary": {...}, "llm_feedback": string }`
- **Errors:** `409` meal not yet processed, `502` LLM/AI service unavailable.

### `GET /api/v1/recommendations/history/`
- **Purpose:** Retrieve historical recommendations for progress tracking.
- **Auth Required:** Yes
- **Response:** `200` paginated list.

> **Recommended Design Decision:** All AI-heavy work (`/detect`, `/match`, `/recommend`) is fronted by Django's `/meals/` and `/recommendations/` endpoints; the FastAPI service itself is not exposed publicly and is documented separately as an internal contract.

---

## 12. Authentication Flow

- **Access Token:** short-lived (e.g., 15 minutes), sent as `Authorization: Bearer <token>` on every protected request.
- **Refresh Token:** longer-lived (e.g., 7 days), stored securely (httpOnly cookie recommended over localStorage), used solely to mint new access tokens.
- **Protected APIs:** enforced via DRF `IsAuthenticated` permission + custom ownership checks (e.g., a user can only access their own meals/profile).
- **Registration Flow:** client submits credentials → Django validates uniqueness → password hashed → user + empty profile shell created.
- **Login Flow:** client submits credentials → Django validates → issues access + refresh token pair.
- **Authorization Flow:** every request to a protected endpoint is validated by DRF's JWT authentication class; expired access tokens trigger a silent refresh via the refresh endpoint before retrying.

---

## 13. User Workflow

```mermaid
flowchart TD
    A[Registration] --> B[Login]
    B --> C[Complete Profile / Onboarding]
    C --> D[Dashboard]
    D --> E[Upload Meal Photo]
    E --> F[AI Detection & Segmentation]
    F --> G[Nutrition Calculation]
    G --> H[Recommendation Generation]
    H --> I[View Report]
    I --> J[History / Progress Tracking]
    J --> D
```

---

## 14. AI Pipeline

1. **Dataset:** Custom-annotated Nepali dish images (polygon masks) combined with reference sources (Nepal Food Composition dataset, Nepali Meals Dataset, Nepal Nutrition and Food Security Portal).
2. **YOLO Training:** Ultralytics YOLO instance-segmentation model fine-tuned on the custom dataset; target ≥ 80% mAP.
3. **Inference:** Uploaded top-down meal photo is passed through the trained model.
4. **Food Detection & Segmentation:** Model predicts bounding boxes, class probabilities, and pixel-level polygon masks per food item.
5. **Non-Maximum Suppression:** Redundant overlapping boxes for the same item are filtered, leaving clean per-item regions.
6. **Portion Estimation:** Segmented pixel regions are mapped against calibrated household reference templates to estimate weight in grams.
7. **Food Name Matching:** Detected class labels are embedded into vector space and compared via cosine similarity against `nutrition_items` embeddings stored in ChromaDB; best match above a confidence threshold is selected.
8. **Nutrition Retrieval:** Matched food's per-100g nutrition values are scaled by the estimated portion weight and summed across all detected items.
9. **Recommendation Generation:** Deterministic nutrition summary + user health profile are assembled into a strict template.
10. **LLM Response Generation:** The LLM receives the pre-filled, validated JSON template (via LangChain + Pydantic-enforced schema) and returns narrative, structured coaching feedback — it does not perform its own arithmetic.

---

## 15. Recommendation Engine

**Inputs:** computed nutrition totals for the meal, user's profile (age, weight, activity level, goal), medical conditions, dietary/religious constraints, and recent meal history.

**Business Rules / Nutrition Logic (deterministic):**
- Daily caloric/macro targets computed from standard formulas (e.g., Mifflin-St Jeor for BMR × activity factor).
- Foods cross-checked against `medical_conditions` and `dietary_constraints` tables to flag or exclude conflicting items (e.g., high-sodium items flagged for hypertension; a food excluded during a fasting period).
- Goal-based logic adjusts targets (weight loss / maintenance / gain, muscle-focused macros, etc.).

**What is Deterministic (code, not AI):**
- All arithmetic: calorie/macro totals, BMR/TDEE, portion-to-nutrient scaling, constraint filtering/flagging.

**What is AI-Generated:**
- The narrative explanation, tone, and practical, culturally-relevant suggestions (e.g., swap suggestions using familiar Nepali dishes), generated strictly from the deterministic summary — never asked to compute numbers itself.

**Prompt Engineering / LLM Role:**
- The LLM is given a system prompt instructing it to act as a supportive nutrition coach, to use only the numeric facts supplied, to respect the listed constraints, and to respond **only** in a fixed JSON schema (validated with Pydantic on the way out) so the frontend can render it predictably without hallucinated fields.

---

## 16. Sequence Diagrams

### Registration
```mermaid
sequenceDiagram
    participant U as User
    participant R as React
    participant D as Django API
    participant DB as PostgreSQL

    U->>R: Fill registration form
    R->>D: POST /auth/register/
    D->>DB: Check email uniqueness
    DB-->>D: OK
    D->>DB: Create user + hashed password
    DB-->>D: User created
    D-->>R: 201 Created
    R-->>U: Redirect to Login
```

### Login
```mermaid
sequenceDiagram
    participant U as User
    participant R as React
    participant D as Django API
    participant DB as PostgreSQL

    U->>R: Enter credentials
    R->>D: POST /auth/login/
    D->>DB: Verify credentials
    DB-->>D: Match found
    D-->>R: 200 { access, refresh }
    R-->>U: Redirect to Dashboard
```

### Meal Upload
```mermaid
sequenceDiagram
    participant U as User
    participant R as React
    participant D as Django API
    participant F as FastAPI AI Service
    participant Y as YOLO
    participant C as ChromaDB
    participant DB as PostgreSQL

    U->>R: Upload meal photo
    R->>D: POST /meals/ (image)
    D->>DB: Store meal record (status=processing)
    D->>F: Forward image for inference
    F->>Y: Run segmentation
    Y-->>F: Masks + labels
    F->>C: Embed labels, query similarity
    C-->>F: Best-matching nutrition items
    F-->>D: Detected items + nutrition data
    D->>DB: Save meal_items + totals
    D-->>R: 200 Meal processed
    R-->>U: Show nutrition summary
```

### Recommendation Generation
```mermaid
sequenceDiagram
    participant R as React
    participant D as Django API
    participant F as FastAPI AI Service
    participant L as LLM
    participant DB as PostgreSQL

    R->>D: POST /recommendations/ { meal_id }
    D->>DB: Fetch meal totals + user profile/constraints
    D->>F: Send structured deterministic summary
    F->>L: Prompt with fixed JSON template
    L-->>F: Structured coaching feedback (JSON)
    F-->>D: Validated response
    D->>DB: Save recommendation record
    D-->>R: 200 { deterministic_summary, llm_feedback }
```

---

## 17. Development Roadmap

| Sprint | Focus |
|---|---|
| Sprint 1 | Project scaffolding, Docker setup, Authentication (register/login/JWT) |
| Sprint 2 | User Profile (onboarding form, medical conditions, constraints) |
| Sprint 3 | Meal Upload pipeline (frontend upload UI, Django meal model, storage) |
| Sprint 4 | AI Detection (YOLO integration, FastAPI service, NMS, portion estimation) |
| Sprint 5 | Recommendation Engine (cosine-similarity matching, nutrition calc, LLM integration) |
| Sprint 6 | Testing (unit, integration, model evaluation) & bug-fixing |
| Sprint 7 | Deployment (Docker Compose, Nginx, cloud hosting, documentation polish) |

---

## 18. Testing Strategy

- **Unit Testing:** Django service-layer functions (nutrition calc, constraint filtering); Pydantic schema validation in FastAPI; React component logic (Jest).
- **Integration Testing:** End-to-end flow from meal upload → detection → nutrition calc → recommendation, using test doubles for the LLM.
- **API Testing:** Postman/Newman collections covering all endpoints, auth edge cases, and error responses.
- **Frontend Testing:** React Testing Library for component rendering and protected-route behavior; Cypress (optional) for E2E flows.
- **Model Evaluation:** YOLO evaluated on a held-out validation split for mAP; similarity matching evaluated for top-1 accuracy against a labeled test set of colloquial food names.
- **Acceptance Testing:** Manual walkthroughs of the full user workflow against the objectives in Section 1.6.

---

## 19. Deployment Architecture

```mermaid
flowchart LR
    subgraph Client
        Browser
    end
    subgraph Edge
        Nginx[Nginx Reverse Proxy]
    end
    subgraph App
        React[React Static Build]
        Gunicorn[Gunicorn + Django]
        Uvicorn[Uvicorn + FastAPI]
    end
    subgraph Data
        PG[(PostgreSQL)]
        Chroma[(ChromaDB)]
        Redis[(Redis - task queue/cache)]
    end

    Browser --> Nginx
    Nginx --> React
    Nginx --> Gunicorn
    Gunicorn --> PG
    Gunicorn --> Uvicorn
    Uvicorn --> Chroma
    Uvicorn --> Redis
```

- **Docker:** each service (frontend, backend, ai_service, postgres, chromadb, redis) has its own container, orchestrated via `docker-compose.yml` for local/dev, with separate production compose or Kubernetes manifests later.
- **Nginx:** reverse proxy + static file serving + TLS termination.
- **Gunicorn:** WSGI server for Django in production.
- **FastAPI/Uvicorn:** ASGI workers for the AI service, scaled independently since inference is the heaviest workload.
- **Redis** *(Recommended Design Decision)*: used as a task queue (Celery/RQ) for async meal processing so uploads return immediately with a "processing" status rather than blocking the request.
- **Cloud Deployment:** Vercel for the React build; Render/Railway for Django and FastAPI; managed PostgreSQL; offline mode falls back to a local quantized LLM (e.g., via Ollama) for fully self-hosted operation.

---

## 20. Future Enhancements

- Offline Mode (local quantized LLM + local inference for low-connectivity areas)
- Multi-language support (Nepali/English UI and LLM output)
- Wearable device integration (step count, heart rate feeding into activity level)
- Continuous model improvement pipeline (active learning from user-corrected labels)
- Cloud-scaled AI inference (GPU-backed managed endpoints)
- Full meal planning (weekly Nepali menu generation aligned with goals/constraints)
- Conversational chatbot interface for ad-hoc nutrition questions

---

## 21. Risks and Challenges

| Risk | Mitigation |
|---|---|
| Limited/imbalanced custom dataset | Data augmentation, active collection, community-sourced images |
| Variable lighting conditions in photos | Lighting-normalization preprocessing, augmented training data |
| Food occlusion (overlapping items on a plate) | Polygon segmentation + NMS tuning; guidance UI for top-down photo capture |
| Portion estimation accuracy | Household reference-template calibration; iterative refinement against ground truth |
| Scalability of AI inference | Async task queue (Redis), independently scalable FastAPI workers |
| Data security & privacy of health info | Encryption at rest, strict access control, minimal data retention policy |
| Model drift over time | Periodic retraining schedule, monitoring of detection confidence distributions |

---

## 22. Project Timeline

Consistent with the proposal's Gantt chart:

| Task | Window |
|---|---|
| Requirement Analysis & Literature Review | Jun 15 – Jun 22 |
| Dataset Collection | Jun 22 – Jul 01 |
| YOLO Segmentation Model Training | Jul 01 – Jul 15 |
| Backend Development & Nutrition Database Integration | Jul 01 – Jul 15 |
| NLP Processing & Cosine Similarity Mapping | Jul 15 – Jul 30 |
| UI Design & Recommendation Engine Development | Jul 15 – Jul 30 |
| Testing, Debugging & Deployment | Aug 01 – Aug 15 |

---

## 23. Coding Standards

- **Naming Conventions:** `snake_case` for Python, `camelCase` for JS/React, `PascalCase` for React components and Django model classes.
- **Folder Structure:** feature-based on the frontend, app-based on the Django backend (see Section 7).
- **API Versioning:** all endpoints prefixed `/api/v1/`; breaking changes bump to `/api/v2/`.
- **Commit Message Convention:** Conventional Commits — `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- **Branch Strategy:** `main` (stable) ← `develop` (integration) ← `feature/*`, `fix/*` branches; PR review required before merge.
- **Documentation Rules:** every new API endpoint documented in this file's API Design section; every ADR-worthy decision logged under `docs/adr/`.

---

## 24. README / Getting Started

### Installation

```bash
git clone <repo-url>
cd nepali-diet-fitness-advisor
```

### Environment Variables

Create `.env` files for each service:

**backend/.env**
```
DJANGO_SECRET_KEY=
DEBUG=True
DATABASE_URL=postgres://user:password@localhost:5432/dietdb
AI_SERVICE_URL=http://localhost:8001
JWT_ACCESS_LIFETIME_MIN=15
JWT_REFRESH_LIFETIME_DAYS=7
```

**ai_service/.env**
```
CHROMA_DB_PATH=./chroma_data
YOLO_MODEL_PATH=../ml_models/yolo/best.pt
LLM_API_KEY=
LLM_PROVIDER=openai|local
```

**frontend/.env**
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### Running Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Running Frontend
```bash
cd frontend
npm install
npm run dev
```

### Running AI Service
```bash
cd ai_service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

### Docker (all services)
```bash
docker-compose up --build
```

### Contributing
1. Fork/branch from `develop`.
2. Follow the coding standards in Section 23.
3. Include tests for new functionality.
4. Open a PR against `develop` with a clear description.

### License
This project is developed for academic purposes as part of the IOE Purwanchal Campus Minor Project. License terms (e.g., MIT) to be finalized by the team before public release.

---

*This document is the living Software Design Document for the project. Sections marked "Recommended Design Decision" are architectural choices made to fill implementation gaps not explicitly specified in the original proposal and should be revisited with the project supervisor as needed.*