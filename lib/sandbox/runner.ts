import { Worker } from 'worker_threads';
import { join } from 'path';
import { mkdirSync, rmSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

import { agentRuntimeLocalStorage } from '@/lib/agents/mietevo-agent';

const WHITELIST = ['fetch_mieter_list', 'fetch_finanzen_summary', 'create_aufgabe', 'get_haeuser_list'];

export function createSupabaseServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );
}

export function createSupabaseUserClient(jwt: string, orgId?: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${jwt}`
  };
  if (orgId) {
    headers['Cookie'] = `current_organisation_id=${orgId}`;
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers
      }
    }
  );
}

/**
 * Layer 1 Sandbox: Calls whitelisted database RPC functions with automatic table fallback
 */
export async function sandboxRpc(rpcName: string, params: Record<string, unknown>, userJwt?: string) {
  if (!WHITELIST.includes(rpcName)) {
    throw new Error(`RPC ${rpcName} is not whitelisted`);
  }

  const store = agentRuntimeLocalStorage.getStore();
  const orgId = (params.p_org_id as string) || store?.orgId;

  const supabase = userJwt 
    ? createSupabaseUserClient(userJwt, orgId) 
    : createSupabaseServiceClient();

  console.log(`[sandboxRpc] Executing ${rpcName}`, { params, orgId });

  // 1. Try RPC execution first
  const { data, error } = await supabase.rpc(rpcName, params);
  if (!error) {
    console.log(`[sandboxRpc] RPC ${rpcName} returned successfully`, { count: Array.isArray(data) ? data.length : 1 });
    return data;
  }

  const isMissingRpc = error.code === 'PGRST202' || 
                       error.message.includes('could not find the function') || 
                       error.message.includes('does not exist') ||
                       (error as any).status === 404;

  if (!isMissingRpc) {
    console.error(`[sandboxRpc] RPC Error in ${rpcName}:`, error);
    throw new Error(`Supabase RPC Error in ${rpcName}: ${error.message}`);
  }

  console.warn(`[sandboxRpc] RPC function '${rpcName}' not found in database. Executing direct table fallback...`, { rpcName, orgId });

  // 2. Direct table fallbacks
  if (rpcName === 'fetch_mieter_list') {
    const limit = (params.p_limit as number) || 50;
    const hausId = params.p_haus_id as string | undefined;
    const search = params.p_search as string | undefined;

    let query = supabase
      .from('Mieter')
      .select('id, name, email, telefonnummer, status, einzug, auszug, wohnung_id, Wohnungen!inner(haus_id)')
      .is('geloescht_am', null)
      .limit(limit);

    if (orgId) {
      query = query.eq('organisation_id', orgId);
    }
    if (hausId) {
      query = query.eq('Wohnungen.haus_id', hausId);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: fallbackData, error: fallbackErr } = await query;
    if (fallbackErr) {
      console.error(`[sandboxRpc] Fallback query failed for ${rpcName}:`, fallbackErr);
      throw new Error(`Fallback table query failed for ${rpcName}: ${fallbackErr.message}`);
    }
    console.log(`[sandboxRpc] Fallback query succeeded for ${rpcName}`, { count: fallbackData?.length || 0 });
    return fallbackData;
  }

  if (rpcName === 'fetch_finanzen_summary') {
    const limit = (params.p_limit as number) || 50;
    const hausId = params.p_haus_id as string | undefined;

    let query = supabase
      .from('Finanzen')
      .select('id, name, betrag, ist_einnahmen, datum, notiz, tags, wohnung_id, Wohnungen(haus_id)')
      .is('geloescht_am', null)
      .order('datum', { ascending: false })
      .limit(limit);

    if (orgId) {
      query = query.eq('organisation_id', orgId);
    }
    if (hausId) {
      query = query.eq('Wohnungen.haus_id', hausId);
    }

    const { data: fallbackData, error: fallbackErr } = await query;
    if (fallbackErr) {
      console.error(`[sandboxRpc] Fallback query failed for ${rpcName}:`, fallbackErr);
      throw new Error(`Fallback table query failed for ${rpcName}: ${fallbackErr.message}`);
    }
    console.log(`[sandboxRpc] Fallback query succeeded for ${rpcName}`, { count: fallbackData?.length || 0 });
    return fallbackData;
  }

  if (rpcName === 'get_haeuser_list') {
    const limit = (params.p_limit as number) || 50;

    let query = supabase
      .from('Haeuser')
      .select('id, name, strasse, plz, ort, groesse')
      .is('geloescht_am', null)
      .order('name', { ascending: true })
      .limit(limit);

    if (orgId) {
      query = query.eq('organisation_id', orgId);
    }

    const { data: fallbackData, error: fallbackErr } = await query;
    if (fallbackErr) {
      console.error(`[sandboxRpc] Fallback query failed for ${rpcName}:`, fallbackErr);
      throw new Error(`Fallback table query failed for ${rpcName}: ${fallbackErr.message}`);
    }
    console.log(`[sandboxRpc] Fallback query succeeded for ${rpcName}`, { count: fallbackData?.length || 0 });
    return fallbackData;
  }

  if (rpcName === 'create_aufgabe') {
    const titel = params.p_titel as string;
    const beschreibung = params.p_beschreibung as string | undefined;
    const mitgliedId = params.p_mitglied_id as string | undefined;

    const { data: fallbackData, error: fallbackErr } = await supabase
      .from('Aufgaben')
      .insert({
        organisation_id: orgId,
        name: titel,
        beschreibung: beschreibung || null,
        ist_erledigt: false,
        erstellt_von: mitgliedId || null,
      })
      .select()
      .single();

    if (fallbackErr) {
      console.error(`[sandboxRpc] Fallback insert failed for ${rpcName}:`, fallbackErr);
      throw new Error(`Fallback table insert failed for ${rpcName}: ${fallbackErr.message}`);
    }
    console.log(`[sandboxRpc] Fallback insert succeeded for ${rpcName}`, { id: fallbackData?.id });
    return fallbackData;
  }

  throw new Error(`Supabase RPC Error in ${rpcName}: ${error.message}`);
}

/**
 * Layer 2 Sandbox: Executes custom TypeScript/JavaScript code in an isolated worker thread
 */
export async function runCustomCode(
  code: string, 
  context: { runId: string; konversationId: string; mitgliedId: string }
): Promise<any> {
  if (process.env.ENABLE_CUSTOM_CODE !== 'true') {
    throw new Error('Custom code execution is disabled by default for security.');
  }

  // Pre-create temporary directory
  const tempDir = `/tmp/agent-${context.runId}`;
  try {
    mkdirSync(tempDir, { recursive: true });
  } catch (e) {
    // Ignore if directory already exists
  }

  try {
    const result = await new Promise((resolve, reject) => {
      const workerPath = join(process.cwd(), 'lib/sandbox/worker.js');
      const worker = new Worker(workerPath, {
        workerData: { code, context, timeout: 30000, memoryLimit: 256 },
        resourceLimits: {
          maxOldGenerationSizeMb: 256,
        },
      });

      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error('Code execution timed out (30s)'));
      }, 30000);

      worker.on('message', (msg) => {
        clearTimeout(timeout);
        if (msg.error) {
          reject(new Error(msg.error));
        } else {
          resolve(msg.result);
        }
      });

      worker.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      worker.on('exit', (exitCode) => {
        clearTimeout(timeout);
        if (exitCode !== 0) {
          reject(new Error(`Worker exited with code ${exitCode}`));
        }
      });
    });

    return result;
  } finally {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup error
    }
  }
}
