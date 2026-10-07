import json
import os
import shutil
from pathlib import Path

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings

# ---------------------------------------------------------
# CONFIGURATION & PATH RESOLUTION
# ---------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
AI_SERVICE_DIR = SCRIPT_DIR.parent

DATA_DIR = AI_SERVICE_DIR / "data"
JSON_PATH = DATA_DIR / "master_database.json"
CHROMA_PATH = AI_SERVICE_DIR / "chroma_db"
COLLECTION_NAME = "nepali_foods"

EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


# ---------------------------------------------------------
# BUILD VECTOR DATABASE
# ---------------------------------------------------------

def build_vector_store():

    # 1. Check JSON file
    if not JSON_PATH.exists():
        raise FileNotFoundError(
            f"Could not find master database at '{JSON_PATH}'."
        )

    # 2. Load master database
    try:
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"Failed to parse JSON in '{JSON_PATH}': {exc}"
        ) from exc
    except Exception as exc:
        raise RuntimeError(
            f"Error reading '{JSON_PATH}': {exc}"
        ) from exc

    foods = data.get("foods")

    if not isinstance(foods, list):
        raise ValueError(
            "master_database.json must contain a top-level 'foods' array."
        )

    if len(foods) == 0:
        raise ValueError(
            "The 'foods' array is empty."
        )

    print(f"Found {len(foods)} food items.")

    # -----------------------------------------------------
    # 3. Create documents
    # -----------------------------------------------------

    documents = []

    for idx, food in enumerate(foods):
        if not isinstance(food, dict):
            raise ValueError(
                f"Invalid food item at index {idx}: expected object, got {type(food).__name__}"
            )

        # Required fields
        food_id = food.get("id")
        name = food.get("name")

        if not food_id or not name:
            raise ValueError(
                f"Food item at index {idx} is missing required 'id' or 'name' field: {food}"
            )

        other_names = food.get(
            "other_names", []
        )
        if not isinstance(other_names, list):
            other_names = [str(other_names)]

        # -------------------------------------------------
        # TEXT THAT GETS EMBEDDED
        #
        # Keep this focused on identifying the food.
        # -------------------------------------------------

        aliases = ", ".join(str(alias) for alias in other_names)

        page_content = (
            f"Food name: {name}\n"
            f"Food ID: {food_id}\n"
            f"Other names and aliases: {aliases}"
        )

        # -------------------------------------------------
        # METADATA
        #
        # This information is stored with the vector but
        # does NOT need to influence semantic matching.
        # -------------------------------------------------

        standard_portion = food.get(
            "standard_portion", {}
        )

        nutrition_sp = food.get(
            "nutrition_per_standard_portion", {}
        )

        nutrition = food.get(
            "nutrition_per_gram", {}
        )

        health = food.get(
            "health_restrictions", {}
        )

        social = food.get(
            "social_restrictions", {}
        )

        metadata = {
            "id": food_id,
            "name": name,
            "other_names": json.dumps(
                other_names,
                ensure_ascii=False
            ),
            "veg_or_nonveg": food.get(
                "veg_or_nonveg",
                ""
            ),
            "fitness_direction": food.get(
                "fitness_direction",
                ""
            ),
            "standard_portion": json.dumps(
                standard_portion,
                ensure_ascii=False
            ),
            "nutrition_per_standard_portion": json.dumps(
                nutrition_sp,
                ensure_ascii=False
            ),
            "nutrition_per_gram": json.dumps(
                nutrition,
                ensure_ascii=False
            ),
            "health_restrictions": json.dumps(
                health,
                ensure_ascii=False
            ),
            "social_restrictions": json.dumps(
                social,
                ensure_ascii=False
            ),
        }

        # -------------------------------------------------
        # Create LangChain document
        # -------------------------------------------------

        document = Document(
            page_content=page_content,
            metadata=metadata,
            id=food_id
        )

        documents.append(document)

    # -----------------------------------------------------
    # 4. Validate duplicate IDs
    # -----------------------------------------------------

    ids = [doc.id for doc in documents]

    if len(ids) != len(set(ids)):
        duplicates = {
            x for x in ids
            if ids.count(x) > 1
        }

        raise ValueError(
            f"Duplicate food IDs found: {duplicates}"
        )

    # -----------------------------------------------------
    # 5. Delete old Chroma database
    #
    # This ensures the vector database always exactly
    # matches master_database.json.
    # -----------------------------------------------------

    chroma_resolved = CHROMA_PATH.resolve()
    protected_paths = (
        SCRIPT_DIR.resolve(),
        DATA_DIR.resolve(),
        AI_SERVICE_DIR.resolve(),
        AI_SERVICE_DIR.parent.resolve(),
    )
    if chroma_resolved in protected_paths:
        raise RuntimeError(
            f"Safety check failed: CHROMA_PATH '{CHROMA_PATH}' resolves to protected path '{chroma_resolved}'."
        )

    if CHROMA_PATH.exists():
        print(
            f"Removing old Chroma database: "
            f"{CHROMA_PATH}"
        )
        shutil.rmtree(CHROMA_PATH)

    CHROMA_PATH.mkdir(parents=True, exist_ok=True)

    # -----------------------------------------------------
    # 6. Load multilingual embedding model
    # -----------------------------------------------------

    print(
        f"Loading embedding model: "
        f"{EMBEDDING_MODEL}"
    )

    try:
        embedding_model = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL
        )
    except Exception as exc:
        raise RuntimeError(
            f"Failed to load embedding model '{EMBEDDING_MODEL}': {exc}"
        ) from exc

    # -----------------------------------------------------
    # 7. Create Chroma vector database
    # -----------------------------------------------------

    print("Creating embeddings...")

    try:
        vectorstore = Chroma.from_documents(
            documents=documents,
            embedding=embedding_model,
            persist_directory=str(CHROMA_PATH),
            collection_name=COLLECTION_NAME
        )
    except Exception as exc:
        raise RuntimeError(
            f"Failed to initialize ChromaDB collection at '{CHROMA_PATH}': {exc}"
        ) from exc

    # -----------------------------------------------------
    # 8. Done
    # -----------------------------------------------------

    print()
    print("=" * 60)
    print("VECTOR DATABASE CREATED SUCCESSFULLY")
    print("=" * 60)

    print(f"Food items:     {len(documents)}")
    print(f"Collection:     {COLLECTION_NAME}")
    print(f"Database path:  {CHROMA_PATH.resolve()}")
    print(f"Embedding:      {EMBEDDING_MODEL}")
    print("=" * 60)


# ---------------------------------------------------------
# MAIN
# ---------------------------------------------------------

if __name__ == "__main__":
    build_vector_store()
