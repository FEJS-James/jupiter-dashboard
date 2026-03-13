import { getData, success, error } from '../_data';

export const onRequestGet: PagesFunction = async (context) => {
  const data = await getData(context.env);
  const id = context.params.id as string;
  const project = data.projectDetails?.[id];
  if (!project) return error('Project not found', 404);
  return success(project);
};
