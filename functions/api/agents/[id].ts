import { getData, success, error } from '../_data';

export const onRequestGet: PagesFunction = async (context) => {
  const data = await getData(context.env);
  const id = context.params.id as string;
  const agent = data.agentDetails?.[id];
  if (!agent) return error('Agent not found', 404);
  return success(agent);
};
