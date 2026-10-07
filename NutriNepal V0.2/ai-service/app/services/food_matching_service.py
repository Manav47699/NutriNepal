import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

logger = logging.getLogger(__name__)

# Base paths relative to project structure (ai-service/)
AI_SERVICE_DIR = Path(__file__).resolve().parents[2]
DEFAULT_CHROMA_DIR = AI_SERVICE_DIR / "chroma_db"
DEFAULT_COLLECTION_NAME = "nepali_foods"
DEFAULT_EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


class FoodMatchingService:
    """
    Service responsible for vector-similarity food matching using the persisted
    ChromaDB vector store and multilingual embedding model.
    """

    def __init__(
        self,
        chroma_dir: Optional[Path | str] = None,
        collection_name: str = DEFAULT_COLLECTION_NAME,
        embedding_model_name: str = DEFAULT_EMBEDDING_MODEL,
    ):
        self.chroma_dir = Path(chroma_dir) if chroma_dir else DEFAULT_CHROMA_DIR
        self.collection_name = collection_name
        self.embedding_model_name = embedding_model_name

        if not self.chroma_dir.exists():
            raise FileNotFoundError(
                f"ChromaDB directory not found at '{self.chroma_dir}'. "
                "Ensure that the vector database has been generated."
            )

        try:
            self.embedding_model = HuggingFaceEmbeddings(
                model_name=self.embedding_model_name
            )
        except Exception as exc:
            raise RuntimeError(
                f"Failed to load embedding model '{self.embedding_model_name}': {exc}"
            ) from exc

        try:
            self.vectorstore = Chroma(
                persist_directory=str(self.chroma_dir),
                embedding_function=self.embedding_model,
                collection_name=self.collection_name,
            )
            count = self.vectorstore._collection.count()
            if count == 0:
                logger.warning(
                    f"ChromaDB collection '{self.collection_name}' at '{self.chroma_dir}' is empty."
                )
        except Exception as exc:
            raise RuntimeError(
                f"Failed to connect to ChromaDB collection '{self.collection_name}' at '{self.chroma_dir}': {exc}"
            ) from exc

    def _parse_metadata(self, raw_metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Deserialize JSON-encoded metadata fields into Python native structures."""
        formatted = dict(raw_metadata)
        json_fields = (
            "other_names",
            "standard_portion",
            "nutrition_per_standard_portion",
            "nutrition_per_gram",
            "health_restrictions",
            "social_restrictions",
        )
        for field in json_fields:
            val = formatted.get(field)
            if isinstance(val, str):
                try:
                    formatted[field] = json.loads(val)
                except Exception:
                    pass
        return formatted

    def search_food(
        self,
        query: str,
        k: int = 1,
    ) -> List[Dict[str, Any]]:
        """
        Perform a vector similarity search for the given food query.

        Args:
            query: The food name or description to search.
            k: Number of nearest matches to return (default: 1).

        Returns:
            A list of dictionary objects containing matched food information,
            including food ID, name, parsed nutrition data, restrictions, and similarity score.
        """
        if not query or not str(query).strip():
            raise ValueError("Food search query cannot be empty.")

        query_str = str(query).strip()

        try:
            results: List[Tuple[Any, float]] = (
                self.vectorstore.similarity_search_with_score(query_str, k=k)
            )
        except Exception as exc:
            raise RuntimeError(
                f"Error during food similarity search for query '{query_str}': {exc}"
            ) from exc

        matches: List[Dict[str, Any]] = []
        for doc, score in results:
            metadata = self._parse_metadata(doc.metadata)
            matches.append(
                {
                    "id": metadata.get("id"),
                    "name": metadata.get("name"),
                    "score": float(score),
                    "veg_or_nonveg": metadata.get("veg_or_nonveg", ""),
                    "fitness_direction": metadata.get("fitness_direction", ""),
                    "nutrition_per_gram": metadata.get("nutrition_per_gram", {}),
                    "standard_portion": metadata.get("standard_portion", {}),
                    "nutrition_per_standard_portion": metadata.get("nutrition_per_standard_portion", {}),
                    "health_restrictions": metadata.get("health_restrictions", {}),
                    "social_restrictions": metadata.get("social_restrictions", {}),
                    "other_names": metadata.get("other_names", []),
                    "document": doc.page_content,
                }
            )

        return matches

    def get_top_match(
        self,
        query: str,
        score_threshold: Optional[float] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Convenience method to retrieve the single best matching food item,
        optionally filtered by a maximum distance score threshold.
        """
        matches = self.search_food(query, k=1)
        if not matches:
            return None

        top = matches[0]
        if score_threshold is not None and top["score"] > score_threshold:
            return None

        return top

    def get_food_by_id(self, food_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a specific food item by its ID directly from ChromaDB."""
        if not food_id or not str(food_id).strip():
            return None
        try:
            res = self.vectorstore._collection.get(
                ids=[str(food_id).strip()],
                include=["metadatas", "documents"]
            )
            if res and res.get("ids") and len(res["ids"]) > 0:
                raw_meta = res["metadatas"][0] if res.get("metadatas") else {}
                doc = res["documents"][0] if res.get("documents") else ""
                metadata = self._parse_metadata(raw_meta)
                return {
                    "id": metadata.get("id", food_id),
                    "name": metadata.get("name", ""),
                    "score": 0.0,
                    "veg_or_nonveg": metadata.get("veg_or_nonveg", ""),
                    "fitness_direction": metadata.get("fitness_direction", ""),
                    "nutrition_per_gram": metadata.get("nutrition_per_gram", {}),
                    "standard_portion": metadata.get("standard_portion", {}),
                    "nutrition_per_standard_portion": metadata.get("nutrition_per_standard_portion", {}),
                    "health_restrictions": metadata.get("health_restrictions", {}),
                    "social_restrictions": metadata.get("social_restrictions", {}),
                    "other_names": metadata.get("other_names", []),
                    "document": doc,
                }
        except Exception as exc:
            logger.error(f"Error fetching food ID '{food_id}' from ChromaDB: {exc}")
        return None

    def get_all_foods(self) -> Dict[str, Dict[str, Any]]:
        """Retrieve all food records indexed in ChromaDB as a mapping {food_id: food_record}."""
        try:
            res = self.vectorstore._collection.get(include=["metadatas", "documents"])
            foods: Dict[str, Dict[str, Any]] = {}
            ids = res.get("ids", [])
            metadatas = res.get("metadatas", [])
            documents = res.get("documents", [])
            for idx, fid in enumerate(ids):
                raw_meta = metadatas[idx] if idx < len(metadatas) else {}
                doc = documents[idx] if idx < len(documents) else ""
                metadata = self._parse_metadata(raw_meta)
                foods[fid] = {
                    "id": metadata.get("id", fid),
                    "name": metadata.get("name", ""),
                    "score": 0.0,
                    "veg_or_nonveg": metadata.get("veg_or_nonveg", ""),
                    "fitness_direction": metadata.get("fitness_direction", ""),
                    "nutrition_per_gram": metadata.get("nutrition_per_gram", {}),
                    "standard_portion": metadata.get("standard_portion", {}),
                    "nutrition_per_standard_portion": metadata.get("nutrition_per_standard_portion", {}),
                    "health_restrictions": metadata.get("health_restrictions", {}),
                    "social_restrictions": metadata.get("social_restrictions", {}),
                    "other_names": metadata.get("other_names", []),
                    "document": doc,
                }
            return foods
        except Exception as exc:
            logger.error(f"Error fetching all foods from ChromaDB: {exc}")
            return {}
