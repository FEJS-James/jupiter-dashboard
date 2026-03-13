// Shared data module for Cloudflare Pages Functions
// This is loaded from the static data.json that was generated from the SQLite database

let cachedData: any = null;

export async function getData(env?: any): Promise<any> {
  if (cachedData) return cachedData;
  
  // In Cloudflare Pages Functions, we can fetch from the same origin
  // But since we're serverless, we'll use the ASSETS binding
  try {
    if (env?.ASSETS) {
      const response = await env.ASSETS.fetch(new Request('https://placeholder/data.json'));
      if (response.ok) {
        cachedData = await response.json();
        return cachedData;
      }
    }
  } catch (e) {
    console.error('Failed to load data from ASSETS:', e);
  }
  
  // Fallback: return minimal data
  return {
    tasks: [], projects: [], agents: [], activity: [],
    agentDetails: {}, projectDetails: {}, taskDetails: {},
    analyticsOverview: {}, analyticsCompletion: {}, analyticsVelocity: {},
    analyticsAgents: {}, analyticsProjects: {}, analyticsAdditional: {},
    activityStats: {}, notifications: [], notificationStats: {}
  };
}

export function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

export function success(data: any, message?: string, status = 200) {
  return json({ success: true, data, message }, status);
}

export function error(msg: string, status = 500) {
  return json({ error: msg }, status);
}
