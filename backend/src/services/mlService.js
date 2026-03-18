const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

async function parseJson(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return { detail: await response.text() };
}

async function getVideoEmbeddings(videoPath, fps = 1) {
  let response;
  try {
    response = await fetch(`${ML_SERVICE_URL}/embed/video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        video_path: videoPath,
        fps,
      }),
    });
  } catch (error) {
    throw new Error(`ML service is unavailable at ${ML_SERVICE_URL}`);
  }

  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(data.detail || data.message || "ML video embedding failed");
  }

  return data;
}

async function getTextEmbedding(text) {
  let response;
  try {
    response = await fetch(`${ML_SERVICE_URL}/embed/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (error) {
    throw new Error(`ML service is unavailable at ${ML_SERVICE_URL}`);
  }

  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(data.detail || data.message || "ML text embedding failed");
  }

  return data.embedding?.[0] || [];
}

module.exports = {
  getTextEmbedding,
  getVideoEmbeddings,
};
