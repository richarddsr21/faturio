export interface GoalProgressInput {
  goal: number;
  currentRevenue: number;
  averageTicket: number;
}

export interface GoalProgress {
  remaining: number;
  estimatedSalesNeeded: number;
  progressPercentage: number;
}

export function calculateGoalProgress(input: GoalProgressInput): GoalProgress {
  const { goal, currentRevenue, averageTicket } = input;
  const remaining = Math.max(goal - currentRevenue, 0);
  const estimatedSalesNeeded = averageTicket > 0 ? Math.ceil(remaining / averageTicket) : 0;
  const progressPercentage = goal > 0 ? Math.min(currentRevenue / goal, 1) : 0;

  return { remaining, estimatedSalesNeeded, progressPercentage };
}
