import { Worker } from 'worker_threads';
import { join } from 'path';
import { mkdirSync, rmSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

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

export function createSupabaseUserClient(jwt: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${jwt}`
        }
      }
    }
  );
}

/**
 * Layer 1 Sandbox: Calls whitelisted database RPC functions
 */
export async function sandboxRpc(rpcName: string, params: Record<string, unknown>, userJwt?: string) {
  if (!WHITELIST.includes(rpcName)) {
    throw new Error(`RPC ${rpcName} is not whitelisted`);
  }

  const supabase = userJwt 
    ? createSupabaseUserClient(userJwt) 
    : createSupabaseServiceClient();

  const { data, error } = await supabase.rpc(rpcName, params);
  if (error) {
    throw new Error(`Supabase RPC Error in ${rpcName}: ${error.message}`);
  }
  return data;
}

/**
 * Layer 2 Sandbox: Executes custom TypeScript/JavaScript code in an isolated worker thread
 */
export async function runCustomCode(
  code: string, 
  context: { runId: string; konversationId: string; mitgliedId: string }
): Promise<any> {
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
