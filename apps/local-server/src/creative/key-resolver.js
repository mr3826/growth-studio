/**
 * OpenAI credentials are read only from the Fastify server process environment.
 * Never search shell history, registry values, user documents, project files, or
 * browser storage for credentials.
 */
export function resolveOpenAiKey() {
  const key = process.env.CONTENT_STUDIO_KEY?.trim();
  return key || null;
}

/** Reports configuration without exposing or validating the secret remotely. */
export function isOpenAiConfigured() {
  return Boolean(resolveOpenAiKey());
}
