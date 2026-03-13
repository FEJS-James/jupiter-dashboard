import { getData, success } from './_data';

export const onRequestGet: PagesFunction = async (context) => {
  const data = await getData(context.env);
  // Filter out perf-agent test data for cleaner display
  const agents = (data.agents || []).filter((a: any) => !a.name.startsWith('perf-agent'));
  return success(agents);
};
