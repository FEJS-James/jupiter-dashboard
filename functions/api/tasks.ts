import { getData, success, error } from './_data';

export const onRequestGet: PagesFunction = async (context) => {
  const data = await getData(context.env);
  const url = new URL(context.request.url);
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const status = url.searchParams.get('status');
  const agent = url.searchParams.get('agent');
  const project = url.searchParams.get('project');
  
  let tasks = data.tasks || [];
  if (status) tasks = tasks.filter((t: any) => t.status === status);
  if (agent) tasks = tasks.filter((t: any) => t.assignedAgent === agent);
  if (project) tasks = tasks.filter((t: any) => String(t.projectId) === project || t.project?.name === project);
  if (limit) tasks = tasks.slice(0, limit);
  
  return success(tasks);
};

export const onRequestPost: PagesFunction = async () => {
  return error('Read-only demo deployment', 405);
};
