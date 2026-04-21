const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "video_embeddings";
const VECTOR_SIZE = 512;
const SEARCH_SCORE_THRESHOLD = Math.max(
  0,
  Number(process.env.QDRANT_SEARCH_SCORE_THRESHOLD || 0),
);
const SEARCH_CANDIDATE_MULTIPLIER = Math.max(
  1,
  Number(process.env.QDRANT_SEARCH_CANDIDATE_MULTIPLIER || 8),
);

function normalizeVector(vector) {
  if (!Array.isArray(vector) || vector.length === 0) {
    return vector;
  }

  const magnitude = Math.sqrt(
    vector.reduce((sum, value) => sum + (Number(value) || 0) * (Number(value) || 0), 0),
  );

  if (!magnitude) {
    return vector.map((value) => Number(value) || 0);
  }

  return vector.map((value) => (Number(value) || 0) / magnitude);
}

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

  const normalizedPoints = points.map((point) => ({
    ...point,
    vector: normalizeVector(point.vector),
  }));
  const vectorSize = normalizedPoints[0]?.vector?.length || VECTOR_SIZE;
  await ensureCollection(vectorSize);

  await qdrantRequest(`/collections/${QDRANT_COLLECTION}/points?wait=true`, {
    method: "PUT",
    body: JSON.stringify({
      points: normalizedPoints,
    }),
  });
}

function buildMustFilter(userId, pointType, options = {}) {
  const must = [
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
  ];

  if (Array.isArray(options.analysisIds) && options.analysisIds.length > 0) {
    must.push({
      key: "analysisId",
      match: {
        any: options.analysisIds,
      },
    });
  }

  return must;
}

async function searchPoints(vector, userId, limit = 5, pointType = "frame", options = {}) {
  const normalizedVector = normalizeVector(vector);
  await ensureCollection(normalizedVector.length || VECTOR_SIZE);
  const rawLimit = Math.max(limit, limit * SEARCH_CANDIDATE_MULTIPLIER);
  const body = {
    vector: normalizedVector,
    limit: rawLimit,
    with_payload: true,
    with_vector: false,
    filter: {
      must: buildMustFilter(userId, pointType, options),
    },
  };

  if (SEARCH_SCORE_THRESHOLD > 0) {
    body.score_threshold = SEARCH_SCORE_THRESHOLD;
  }

  const data = await qdrantRequest(`/collections/${QDRANT_COLLECTION}/points/search`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  return data.result || [];
}

async function deletePointsByAnalysisId(analysisId, userId) {
  if (!analysisId || !userId) {
    return;
  }

  await ensureCollection();

  await qdrantRequest(`/collections/${QDRANT_COLLECTION}/points/delete?wait=true`, {
    method: "POST",
    body: JSON.stringify({
      filter: {
        must: [
          {
            key: "analysisId",
            match: {
              value: analysisId,
            },
          },
          {
            key: "userId",
            match: {
              value: userId,
            },
          },
        ],
      },
    }),
  });
}

module.exports = {
  deletePointsByAnalysisId,
  ensureCollection,
  searchPoints,
  upsertPoint,
  upsertPoints,
};
