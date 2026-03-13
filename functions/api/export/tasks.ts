import { getData, success } from '../_data';
export const onRequestGet: PagesFunction = async (context) => {
  const data = await getData(context.env);
  return success(data.tasks || []);
};
export const onRequestPost: PagesFunction = async (context) => {
  const data = await getData(context.env);
  return success(data.tasks || []);
};
