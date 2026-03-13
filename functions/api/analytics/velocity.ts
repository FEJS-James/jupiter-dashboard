import { getData, success } from '../_data';
export const onRequestGet: PagesFunction = async (context) => {
  const data = await getData(context.env);
  return success(data.analyticsVelocity || {});
};
