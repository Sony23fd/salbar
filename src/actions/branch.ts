// ==========================================
// Server Action: Branch Inactivity Monitoring
// ==========================================

import { db } from '../lib/db';
import { ActionResponse, InactiveBranchAlert } from '../types/wms';

/**
 * Fetches branches that have had NO order or delivery activity in the last 7 days.
 * Access: ADMIN
 */
export async function getInactiveBranches(
  thresholdDays = 7
): Promise<ActionResponse<InactiveBranchAlert[]>> {
  try {
    const inactiveBranches = await db.getInactiveBranches(thresholdDays);

    return {
      success: true,
      message: `Found ${inactiveBranches.length} branch(es) inactive for ${thresholdDays}+ days.`,
      data: inactiveBranches,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to fetch inactive branches.',
    };
  }
}
