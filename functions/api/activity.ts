import { getData, success } from './_data';

export const onRequestGet: PagesFunction = async (context) => {
  const data = await getData(context.env);
  const url = new URL(context.request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const activities = (data.activity || []).slice(0, limit);
  return success(activities);
};
