import { getData, success, error } from '../_data';

export const onRequestGet: PagesFunction = async (context) => {
  const data = await getData(context.env);
  const id = context.params.id as string;
  const task = data.taskDetails?.[id];
  if (!task) return error('Task not found', 404);
  return success(task);
};

export const onRequestPut: PagesFunction = async () => error('Read-only demo', 405);
export const onRequestDelete: PagesFunction = async () => error('Read-only demo', 405);
