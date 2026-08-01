/**
 * SPEX AI Gateway
 * مزودات متعددة: OpenAI, Anthropic, Google Gemini, NVIDIA NIM وأي endpoint متوافق مع OpenAI.
 * لا يعتمد منطق المنصة على مزود واحد؛ يتم اختيار المزود حسب المهمة مع fallback تلقائي.
 */

type ChatRole = 'system' | 'user' | 'assistant';
export type AIProviderId = 'nvidia' | 'openai' | 'anthropic' | 'gemini' | 'openai-compatible';

export interface AIMessage {
  role: ChatRole;
  content: string;
}

export interface AIRequest {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  preferredProvider?: AIProviderId;
  preferredModel?: string;
}

export interface AIResult {
  text: string;
  provider: AIProviderId;
  model: string;
}

interface ProviderConfig {
  id: AIProviderId;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  enabled: boolean;
}

const env = (key: string) => process.env[key]?.trim() || '';

function configs(): ProviderConfig[] {
  return [
    {
      id: 'nvidia',
      apiKey: env('NVIDIA_API_KEY'),
      baseUrl: env('NVIDIA_BASE_URL') || 'https://integrate.api.nvidia.com/v1',
      model: env('NVIDIA_MODEL') || 'meta/llama-3.1-8b-instruct',
      enabled: Boolean(env('NVIDIA_API_KEY'))
    },
    {
      id: 'openai',
      apiKey: env('OPENAI_API_KEY'),
      baseUrl: env('OPENAI_BASE_URL') || 'https://api.openai.com/v1',
      model: env('OPENAI_MODEL') || 'gpt-4o-mini',
      enabled: Boolean(env('OPENAI_API_KEY'))
    },
    {
      id: 'anthropic',
      apiKey: env('ANTHROPIC_API_KEY'),
      model: env('ANTHROPIC_MODEL') || 'claude-3-5-haiku-latest',
      enabled: Boolean(env('ANTHROPIC_API_KEY'))
    },
    {
      id: 'gemini',
      apiKey: env('GEMINI_API_KEY'),
      model: env('GEMINI_MODEL') || 'gemini-2.5-flash',
      enabled: Boolean(env('GEMINI_API_KEY')) && env('GEMINI_API_KEY') !== 'MY_GEMINI_API_KEY'
    },
    {
      id: 'openai-compatible',
      apiKey: env('AI_COMPATIBLE_API_KEY'),
      baseUrl: env('AI_COMPATIBLE_BASE_URL'),
      model: env('AI_COMPATIBLE_MODEL'),
      enabled: Boolean(env('AI_COMPATIBLE_API_KEY') && env('AI_COMPATIBLE_BASE_URL') && env('AI_COMPATIBLE_MODEL'))
    }
  ];
}

export function getAIProviderStatus() {
  return configs().map(({ id, baseUrl, model, enabled }) => ({ id, baseUrl, model, enabled }));
}

function parseJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = 45_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAICompatible(config: ProviderConfig, req: AIRequest): Promise<AIResult> {
  const response = await fetchWithTimeout(`${config.baseUrl!.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model: config.model,
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 4000,
      ...(req.json ? { response_format: { type: 'json_object' } } : {})
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${config.id} ${response.status}: ${JSON.stringify(data)}`);
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`${config.id}: empty response`);
  return { text, provider: config.id, model: config.model! };
}

async function callAnthropic(config: ProviderConfig, req: AIRequest): Promise<AIResult> {
  const system = req.messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  const messages = req.messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content
  }));
  const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: req.maxTokens ?? 4000,
      temperature: req.temperature ?? 0.7,
      ...(system ? { system } : {}),
      messages
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`anthropic ${response.status}: ${JSON.stringify(data)}`);
  const text = Array.isArray(data?.content) ? data.content.filter((x: any) => x.type === 'text').map((x: any) => x.text).join('') : '';
  if (!text) throw new Error('anthropic: empty response');
  return { text, provider: config.id, model: config.model! };
}

async function callGemini(config: ProviderConfig, req: AIRequest): Promise<AIResult> {
  const contents = req.messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));
  const systemInstruction = req.messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model!)}:generateContent?key=${encodeURIComponent(config.apiKey!)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
      contents,
      generationConfig: {
        temperature: req.temperature ?? 0.7,
        maxOutputTokens: req.maxTokens ?? 4000,
        ...(req.json ? { responseMimeType: 'application/json' } : {})
      }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`gemini ${response.status}: ${JSON.stringify(data)}`);
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('');
  if (!text) throw new Error('gemini: empty response');
  return { text, provider: config.id, model: config.model! };
}

async function callProvider(config: ProviderConfig, req: AIRequest): Promise<AIResult> {
  if (config.id === 'anthropic') return callAnthropic(config, req);
  if (config.id === 'gemini') return callGemini(config, req);
  return callOpenAICompatible(config, req);
}

export async function generateAI(req: AIRequest): Promise<AIResult> {
  const available = configs().filter(p => p.enabled);
  if (!available.length) throw new Error('No AI provider is configured. Configure NVIDIA_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY or GEMINI_API_KEY.');

  const preferred = req.preferredProvider ? available.filter(p => p.id === req.preferredProvider) : [];
  const fallback = available.filter(p => !req.preferredProvider || p.id !== req.preferredProvider);
  const ordered = [...preferred, ...fallback];
  const errors: string[] = [];

  for (const provider of ordered) {
    try {
      const selected = req.preferredModel && provider.id === req.preferredProvider
        ? { ...provider, model: req.preferredModel }
        : provider;
      return await callProvider(selected, req);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${provider.id}: ${message}`);
      console.warn(`[AI Gateway] ${provider.id} failed, trying fallback.`, message);
    }
  }

  throw new Error(`All configured AI providers failed: ${errors.join(' | ')}`);
}

export async function testAIProvider(providerId: AIProviderId): Promise<{ valid: boolean; message: string; provider: AIProviderId }> {
  const provider = configs().find(p => p.id === providerId);
  if (!provider?.enabled) return { valid: false, message: 'المزود غير مفعّل أو بياناته غير مكتملة في إعدادات الخادم.', provider: providerId };
  try {
    const result = await generateAI({
      preferredProvider: providerId,
      messages: [{ role: 'user', content: 'Reply with exactly: SPEX_OK' }],
      maxTokens: 10,
      temperature: 0
    });
    return { valid: result.provider === providerId && result.text.trim().length > 0, message: result.provider === providerId ? `تم الاتصال بنجاح عبر ${result.provider} / ${result.model}.` : `فشل المزود ${providerId} وتم التحويل تلقائياً إلى ${result.provider}.`, provider: providerId };
  } catch {
    return { valid: false, message: 'فشل الاتصال بالمزود. تحقق من المفتاح والنموذج وحدود الاستخدام.', provider: providerId };
  }
}

export function tryParseJson<T>(text: string): T | null {
  try { return parseJson(text) as T; } catch { return null; }
}
