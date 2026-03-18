const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "video_embeddings";
const VECTOR_SIZE = 512;
const MIN_SEARCH_SCORE_THRESHOLD = 0.27;
const SEARCH_SCORE_THRESHOLD = Math.max(
  MIN_SEARCH_SCORE_THRESHOLD,
  Number(process.env.QDRANT_SEARCH_SCORE_THRESHOLD || MIN_SEARCH_SCORE_THRESHOLD),
);
const SEARCH_CANDIDATE_MULTIPLIER = Math.max(
  1,
  Number(process.env.QDRANT_SEARCH_CANDIDATE_MULTIPLIER || 8),
);

function getCollectionVectorsConfig(collectionResult) {
  const vectors = collectionResult?.config?.params?.vectors;
  if (!vectors || Array.isArray(vectors)) {
    return null;
  }

  if (typeof vectors.size === "number") {
    return vectors;
  }

  const firstVectorName = Object.keys(vectors)[0];
  return firstVectorName ? vectors[firstVectorName] : null;
}

async function qdrantRequest(path, options = {}) {
  const response = await fetch(`${QDRANT_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(async () => ({
    status: "error",
    result: null,
    detail: await response.text(),
  }));

  if (!response.ok) {
    throw new Error(data.status?.error || data.detail || "Qdrant request failed");
  }

  return data;
}

async function ensureCollection(vectorSize = VECTOR_SIZE) {
  const response = await fetch(`${QDRANT_URL}/collections/${QDRANT_COLLECTION}`);

  if (response.ok) {
    const data = await response.json().catch(() => null);
    const vectorsConfig = getCollectionVectorsConfig(data?.result);
    const configuredSize = vectorsConfig?.size;
    const configuredDistance = vectorsConfig?.distance;

    if (configuredSize && configuredSize !== vectorSize) {
      throw new Error(
        `Qdrant collection ${QDRANT_COLLECTION} has vector size ${configuredSize}, expected ${vectorSize}`,
      );
    }

    if (configuredDistance && configuredDistance !== "Cosine") {
      throw new Error(
        `Qdrant collection ${QDRANT_COLLECTION} uses ${configuredDistance} distance, expected Cosine`,
      );
    }

    return;
  }

  if (response.status !== 404) {
    const detail = await response.text();
    throw new Error(detail || "Failed to inspect Qdrant collection");
  }

  await qdrantRequest(`/collections/${QDRANT_COLLECTION}`, {
    method: "PUT",
    body: JSON.stringify({
      vectors: {
        size: vectorSize,
        distance: "Cosine",
      },
    }),
  });
}

async function upsertPoint(pointId, vector, payload) {
  return upsertPoints([
    {
      id: pointId,
      vector,
      payload,
    },
  ]);
}

async function upsertPoints(points) {
  if (!Array.isArray(points) || points.length === 0) {
    return;
  }

  const vectorSize = points[0]?.vector?.length || VECTOR_SIZE;
  await ensureCollection(vectorSize);

  await qdrantRequest(`/collections/${QDRANT_COLLECTION}/points?wait=true`, {
    method: "PUT",
    body: JSON.stringify({
      points,
    }),
  });
}

async function searchPoints(vector, userId, limit = 5, pointType = "frame") {
  await ensureCollection(vector.length || VECTOR_SIZE);
  const rawLimit = Math.max(limit, limit * SEARCH_CANDIDATE_MULTIPLIER);

  const data = await qdrantRequest(`/collections/${QDRANT_COLLECTION}/points/search`, {
    method: "POST",
    body: JSON.stringify({
      vector,
      limit: rawLimit,
      with_payload: true,
      with_vector: false,
      score_threshold: SEARCH_SCORE_THRESHOLD,
      filter: {
        must: [
          {
            key: "userId",
            match: {
              value: userId,
            },
          },
          {
            key: "pointType",
            match: {
              value: pointType,
            },
          },
        ],
      },
    }),
  });

  return data.result || [];
}

module.exports = {
  ensureCollection,
  searchPoints,
  upsertPoint,
  upsertPoints,
};
