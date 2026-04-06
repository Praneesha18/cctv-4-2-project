const ABSTRACT_EMAIL_REPUTATION_URL = "https://emailreputation.abstractapi.com/v1/";
const ABSTRACT_MAX_RETRIES = 2;
const ABSTRACT_RETRY_DELAY_MS = 700;

function normalizeEmail(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildAbstractRateLimitError() {
  const error = new Error(
    "Email validation is temporarily busy. Please try again in a moment.",
  );
  error.statusCode = 429;
  return error;
}

async function validateEmailWithAbstract(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    const error = new Error("Email is required");
    error.statusCode = 400;
    throw error;
  }

  const apiKey = process.env.ABSTRACT_API_KEY?.trim();
  if (!apiKey) {
    const error = new Error("ABSTRACT_API_KEY is not configured");
    error.statusCode = 500;
    throw error;
  }

  const url = new URL(ABSTRACT_EMAIL_REPUTATION_URL);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("email", normalizedEmail);

  let response;
  let attempt = 0;

  while (attempt <= ABSTRACT_MAX_RETRIES) {
    try {
      response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
        },
      });
    } catch (fetchError) {
      const error = new Error("Unable to reach Abstract email validation service");
      error.statusCode = 502;
      error.cause = fetchError;
      throw error;
    }

    if (response.ok) {
      break;
    }

    if (response.status !== 429 || attempt === ABSTRACT_MAX_RETRIES) {
      break;
    }

    const retryAfterHeader = response.headers.get("retry-after");
    const retryAfterSeconds = Number.parseInt(retryAfterHeader || "", 10);
    const delayMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? retryAfterSeconds * 1000
      : ABSTRACT_RETRY_DELAY_MS * (attempt + 1);

    attempt += 1;
    await wait(delayMs);
  }

  if (!response.ok) {
    let errorMessage = `Abstract API request failed with status ${response.status}`;
    let errorCode = null;

    try {
      const errorBody = await response.json();
      if (typeof errorBody?.error?.message === "string" && errorBody.error.message.trim()) {
        errorMessage = errorBody.error.message.trim();
        errorCode = errorBody.error.code ?? null;
      } else if (typeof errorBody?.message === "string" && errorBody.message.trim()) {
        errorMessage = errorBody.message.trim();
      }
    } catch {
      // Ignore body parsing failures and keep the fallback status-based message.
    }

    if (response.status === 429 || errorCode === "too_many_requests") {
      throw buildAbstractRateLimitError();
    }

    const error = new Error(errorMessage);
    error.statusCode = 502;
    throw error;
  }

  const data = await response.json();
  const deliverability = data?.email_deliverability ?? {};
  const quality = data?.email_quality ?? {};
  const risk = data?.email_risk ?? {};
  const sender = data?.email_sender ?? {};
  const domainInfo = data?.email_domain ?? {};
  const isValidFormat = deliverability?.is_format_valid === true;
  const isMxFound = deliverability?.is_mx_valid === true;
  const isSmtpValid = deliverability?.is_smtp_valid === true;
  const isDisposable = quality?.is_disposable === true;
  const isCatchAll = quality?.is_catchall === true;
  const isRoleAccount = quality?.is_role === true;
  const isFreeProvider = quality?.is_free_email === true;
  const qualityScore = typeof quality?.score === "number" ? quality.score : null;
  const deliverabilityStatus = (deliverability?.status || "unknown").toUpperCase();
  const riskStatus = (risk?.address_risk_status || "unknown").toUpperCase();

  return {
    email: normalizedEmail,
    deliverability: deliverabilityStatus,
    qualityScore,
    isValidFormat,
    isMxFound,
    isSmtpValid,
    isDisposable,
    isFreeProvider,
    isRoleAccount,
    isCatchAll,
    domain: data?.email_address?.split("@")[1] || domainInfo?.domain || null,
    localPart: data?.email_address?.split("@")[0] || null,
    isGmail: (domainInfo?.domain ?? "").toLowerCase() === "gmail.com",
    suggestedCorrection: null,
    riskStatus,
    providerName: sender?.email_provider_name ?? null,
    isValid:
      isValidFormat &&
      isMxFound &&
      isSmtpValid &&
      !isDisposable &&
      deliverabilityStatus === "DELIVERABLE",
    raw: data,
  };
}

module.exports = {
  normalizeEmail,
  validateEmailWithAbstract,
};
